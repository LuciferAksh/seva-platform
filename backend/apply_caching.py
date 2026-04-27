import os

# 1. Update firestore_store.py
fs_store_path = 'C:/Solution Codex/backend/app/firestore_store.py'
with open(fs_store_path, 'r', encoding='utf-8') as f:
    fs_content = f.read()

old_fs_matches = """    def get_matches(self, need_id: str) -> list[MatchRecommendation]:
        doc = self.db.collection('needs').document(need_id).get()
        if not doc.exists:
            return []
        need = NeedReport(**doc.to_dict())

        volunteers = self.list_volunteers()
        from .matching import rank_volunteers
        return rank_volunteers(need, volunteers)"""

new_fs_matches = """    def get_matches(self, need_id: str) -> list[MatchRecommendation]:
        # 1. Check cache first
        match_ref = self.db.collection('need_matches').document(need_id)
        match_doc = match_ref.get()
        if match_doc.exists:
            data = match_doc.to_dict()
            if "matches" in data:
                from .models import MatchRecommendation
                return [MatchRecommendation(**m) for m in data["matches"]]

        # 2. Compute live if not cached
        doc = self.db.collection('needs').document(need_id).get()
        if not doc.exists:
            return []
        need = NeedReport(**doc.to_dict())

        volunteers = self.list_volunteers()
        from .matching import rank_volunteers
        matches = rank_volunteers(need, volunteers)
        
        # 3. Save to cache
        try:
            match_ref.set({"matches": [m.model_dump() for m in matches]})
        except Exception as e:
            import logging
            logging.error(f"Failed to cache matches: {e}")
            
        return matches"""

if old_fs_matches in fs_content:
    fs_content = fs_content.replace(old_fs_matches, new_fs_matches)
    with open(fs_store_path, 'w', encoding='utf-8') as f:
        f.write(fs_content)
    print("Updated firestore_store.py")


# 2. Update store.py (DemoStore)
store_path = 'C:/Solution Codex/backend/app/store.py'
with open(store_path, 'r', encoding='utf-8') as f:
    store_content = f.read()

old_demo_matches = """    def get_matches(self, need_id: str) -> list[MatchRecommendation]:
        need = next((item for item in self.needs if item.id == need_id), None)
        if need is None:
            return []

        from .matching import rank_volunteers
        return rank_volunteers(need, self.volunteers)"""

new_demo_matches = """    def get_matches(self, need_id: str) -> list[MatchRecommendation]:
        if not hasattr(self, 'matches_cache'):
            self.matches_cache = {}
        if need_id in self.matches_cache:
            return self.matches_cache[need_id]

        need = next((item for item in self.needs if item.id == need_id), None)
        if need is None:
            return []

        from .matching import rank_volunteers
        matches = rank_volunteers(need, self.volunteers)
        self.matches_cache[need_id] = matches
        return matches"""

if old_demo_matches in store_content:
    store_content = store_content.replace(old_demo_matches, new_demo_matches)
    with open(store_path, 'w', encoding='utf-8') as f:
        f.write(store_content)
    print("Updated store.py")


# 3. Update main.py
main_path = 'C:/Solution Codex/backend/app/main.py'
with open(main_path, 'r', encoding='utf-8') as f:
    main_content = f.read()

main_content = main_content.replace(
    "from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile",
    "from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, UploadFile"
)

old_create_report = """@app.post("/api/reports", response_model=NeedReport)
def create_report(payload: ReportSubmission) -> NeedReport:
    processor = SubmissionProcessor()
    need = processor.process_text(payload.text, payload.reporter_name)
    store.create_need(need)
    return need"""

new_create_report = """@app.post("/api/reports", response_model=NeedReport)
def create_report(payload: ReportSubmission, background_tasks: BackgroundTasks) -> NeedReport:
    processor = SubmissionProcessor()
    need = processor.process_text(payload.text, payload.reporter_name)
    store.create_need(need)
    background_tasks.add_task(store.get_matches, need.id)
    return need"""

old_upload_report = """@app.post("/api/reports/upload", response_model=NeedReport)
async def create_upload_report(
    source_type: str = Form("text"),
    text: str = Form(""),
    reporter_name: str = Form("Field Worker"),
    file: UploadFile | None = File(None),
) -> NeedReport:
    processor = SubmissionProcessor()
    need = await processor.process_upload(source_type, text, reporter_name, file)
    store.create_need(need)
    return need"""

new_upload_report = """@app.post("/api/reports/upload", response_model=NeedReport)
async def create_upload_report(
    background_tasks: BackgroundTasks,
    source_type: str = Form("text"),
    text: str = Form(""),
    reporter_name: str = Form("Field Worker"),
    file: UploadFile | None = File(None),
) -> NeedReport:
    processor = SubmissionProcessor()
    need = await processor.process_upload(source_type, text, reporter_name, file)
    store.create_need(need)
    background_tasks.add_task(store.get_matches, need.id)
    return need"""

if old_create_report in main_content:
    main_content = main_content.replace(old_create_report, new_create_report)
if old_upload_report in main_content:
    main_content = main_content.replace(old_upload_report, new_upload_report)

with open(main_path, 'w', encoding='utf-8') as f:
    f.write(main_content)
print("Updated main.py")
