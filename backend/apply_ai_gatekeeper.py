import os

# 1. Update google_pipeline.py
pipeline_path = 'C:/Solution Codex/backend/app/services/google_pipeline.py'
with open(pipeline_path, 'r', encoding='utf-8') as f:
    pipe_content = f.read()

old_verify = """    def verify_completion_image(self, image_bytes: bytes, mime_type: str) -> tuple[int, str]:
        if not self._genai_client:
            return 0, "Demo mode: AI not configured"

        try:
            from google.genai.types import Part
            part = Part.from_bytes(data=image_bytes, mime_type=mime_type)

            schema = {
                "type": "OBJECT",
                "properties": {
                    "verified_people": {"type": "INTEGER"},
                    "reasoning": {"type": "STRING"}
                },
                "required": ["verified_people", "reasoning"]
            }

            prompt = (
                "Analyze this relief distribution photo. Count the exact number of people receiving aid "
                "and confirm if this looks like a valid completion photo. Provide the count and your reasoning."
            )

            response = self._genai_client.models.generate_content(
                model=self.settings.vertex_fast_model,
                contents=[prompt, part],
                config={
                    "temperature": 0,
                    "response_mime_type": "application/json",
                    "response_schema": schema,
                }
            )
            parsed = json.loads(response.text)
            return parsed.get("verified_people", 0), parsed.get("reasoning", "")
        except Exception as e:
            logger.error("AI verification failed due to an exception.")
            return 0, "AI verification failed: Internal processing error\""""

new_verify = """    def verify_completion_image(self, image_bytes: bytes, mime_type: str) -> tuple[bool, int, str]:
        if not self._genai_client:
            return True, 0, "Demo mode: AI not configured"

        try:
            from google.genai.types import Part
            part = Part.from_bytes(data=image_bytes, mime_type=mime_type)

            schema = {
                "type": "OBJECT",
                "properties": {
                    "is_valid_delivery": {"type": "BOOLEAN"},
                    "verified_people": {"type": "INTEGER"},
                    "reasoning": {"type": "STRING"}
                },
                "required": ["is_valid_delivery", "verified_people", "reasoning"]
            }

            prompt = (
                "You are an expert NGO auditor. Analyze this photo submitted as proof of an emergency relief delivery or rescue mission. "
                "1. Determine if this is a legitimate photo of aid distribution, rescue work, or disaster relief. If it is just a photo of text, a random object, a selfie without context, or unrelated to aid, set 'is_valid_delivery' to false. "
                "2. If valid, estimate the exact number of people actively receiving aid or being rescued in the photo. "
                "3. Provide a short reasoning for your decision."
            )

            response = self._genai_client.models.generate_content(
                model=self.settings.vertex_fast_model,
                contents=[prompt, part],
                config={
                    "temperature": 0,
                    "response_mime_type": "application/json",
                    "response_schema": schema,
                }
            )
            parsed = json.loads(response.text)
            return parsed.get("is_valid_delivery", True), parsed.get("verified_people", 0), parsed.get("reasoning", "")
        except Exception as e:
            logger.error("AI verification failed due to an exception.")
            return False, 0, "AI verification failed: Internal processing error" """

if old_verify in pipe_content:
    pipe_content = pipe_content.replace(old_verify, new_verify)
    with open(pipeline_path, 'w', encoding='utf-8') as f:
        f.write(pipe_content)
    print("Updated google_pipeline.py")
else:
    # Try regex if exact match fails
    import re
    verify_pattern = r'def verify_completion_image\(self, image_bytes: bytes, mime_type: str\) -> tuple\[int, str\]:.*?return 0, "AI verification failed: Internal processing error"'
    pipe_content = re.sub(verify_pattern, new_verify.strip(), pipe_content, flags=re.DOTALL)
    with open(pipeline_path, 'w', encoding='utf-8') as f:
        f.write(pipe_content)
    print("Updated google_pipeline.py using regex")

# 2. Update main.py
main_path = 'C:/Solution Codex/backend/app/main.py'
with open(main_path, 'r', encoding='utf-8') as f:
    main_content = f.read()

old_main_logic = """            media_uri = stored.uri

            verified_people, reasoning = pipeline.verify_completion_image(file_bytes, file.content_type or "image/jpeg")

    completion = store.mark_complete("""

new_main_logic = """            media_uri = stored.uri

            is_valid, verified_people, reasoning = pipeline.verify_completion_image(file_bytes, file.content_type or "image/jpeg")
            
            if not is_valid:
                raise HTTPException(status_code=400, detail=f"❌ AI Audit Failed: {reasoning}")

    completion = store.mark_complete("""

if old_main_logic in main_content:
    main_content = main_content.replace(old_main_logic, new_main_logic)
    with open(main_path, 'w', encoding='utf-8') as f:
        f.write(main_content)
    print("Updated main.py")
else:
    print("Failed to find main.py logic")
