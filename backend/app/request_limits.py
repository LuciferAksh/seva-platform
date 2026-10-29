from starlette.responses import JSONResponse
from fastapi import HTTPException


class RequestBodyLimit:
    """Reject oversized bodies before multipart parsing can consume disk/memory."""
    def __init__(self,app,max_bytes=12*1024*1024):
        self.app=app;self.max_bytes=max_bytes

    async def __call__(self,scope,receive,send):
        if scope['type']!='http':return await self.app(scope,receive,send)
        headers=dict(scope.get('headers',[]))
        try:size=int(headers.get(b'content-length',b'0'))
        except ValueError:size=self.max_bytes+1
        if size>self.max_bytes:
            return await JSONResponse({'detail':'Request exceeds the 12 MB body limit'},status_code=413)(scope,receive,send)
        received=0
        async def limited_receive():
            nonlocal received
            message=await receive()
            if message['type']=='http.request':
                received+=len(message.get('body',b''))
                if received>self.max_bytes:raise HTTPException(413,'Request exceeds the 12 MB body limit')
            return message
        await self.app(scope,limited_receive,send)
