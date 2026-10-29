from __future__ import annotations
from io import BytesIO
from pathlib import Path
from uuid import uuid4
import httpx
from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError
from ..config import get_settings


async def read_upload(file: UploadFile, image_only=False):
    settings=get_settings()
    data=await file.read(settings.max_upload_bytes+1)
    if not data or len(data)>settings.max_upload_bytes:
        raise HTTPException(413,'Choose a nonempty file smaller than 10 MB')
    mime=(file.content_type or '').split(';')[0]
    images={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'}
    audio={'audio/webm':'.webm','video/webm':'.webm','audio/ogg':'.ogg','audio/wav':'.wav','audio/mpeg':'.mp3','audio/mp4':'.m4a'}
    if mime not in images and (image_only or mime not in audio):
        raise HTTPException(415,'Use JPG, PNG, WebP, WebM, Ogg, WAV, MP3 or M4A')
    if mime in images:
        try:
            with Image.open(BytesIO(data)) as image:
                if image.width*image.height>25000000:raise ValueError()
                actual={'JPEG':'image/jpeg','PNG':'image/png','WEBP':'image/webp'}.get(image.format)
                image.verify()
                if actual!=mime:raise ValueError()
        except (UnidentifiedImageError,OSError,ValueError,Image.DecompressionBombError):
            raise HTTPException(415,'The photo is invalid or too large to decode') from None
    return data,mime,(images|audio)[mime]


def save_media(data,mime,suffix,uid):
    settings=get_settings();name=f'{uid}/{uuid4().hex}{suffix}'
    if settings.demo:
        path=settings.local_upload_dir/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
        return name
    try:
        response=httpx.post(settings.supabase_url+'/storage/v1/object/'+settings.supabase_bucket+'/'+name,
            headers={'apikey':settings.supabase_key,'Authorization':'Bearer '+settings.supabase_key,'Content-Type':mime},content=data,timeout=30)
        response.raise_for_status()
    except httpx.HTTPError:
        raise HTTPException(503,'Photo storage unavailable; your mission has not been completed') from None
    return name


def signed_media(name):
    settings=get_settings()
    if settings.demo:
        path=(settings.local_upload_dir/name).resolve()
        if not path.is_relative_to(settings.local_upload_dir.resolve()) or not path.is_file():raise HTTPException(404,'Photo not found')
        return path
    try:
        r=httpx.post(settings.supabase_url+'/storage/v1/object/sign/'+settings.supabase_bucket+'/'+name,
            headers={'apikey':settings.supabase_key,'Authorization':'Bearer '+settings.supabase_key},json={'expiresIn':120},timeout=15)
        r.raise_for_status()
        return settings.supabase_url+'/storage/v1'+r.json()['signedURL']
    except (httpx.HTTPError,KeyError):raise HTTPException(503,'Photo is temporarily unavailable') from None
