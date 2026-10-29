from datetime import datetime, timedelta, timezone
from .models import NeedReport, NeedExtraction, Volunteer
from .repository import change


def seed_demo(repository):
    """Synthetic Chennai flood-response scenario; never used in connected mode."""
    volunteers = [
        ('asha', 'Asha Verma', 'Adyar', 13.0067, 80.2573, ['distribution', 'coordination'], ['English', 'Tamil'], .96),
        ('rohan', 'Rohan Mehta', 'Mylapore', 13.033, 80.267, ['first-aid', 'medical-support'], ['English', 'Hindi'], .94),
        ('priya', 'Priya Nair', 'Velachery', 12.981, 80.218, ['logistics', 'coordination'], ['English', 'Tamil'], .92),
        ('arjun', 'Arjun Kumar', 'T. Nagar', 13.041, 80.234, ['distribution', 'logistics'], ['English', 'Tamil'], .9),
        ('meera', 'Meera Iyer', 'Thiruvanmiyur', 12.984, 80.259, ['teaching', 'community-outreach'], ['English', 'Tamil'], .95),
        ('dev', 'Dev Patel', 'Guindy', 13.006, 80.212, ['first-aid', 'medical-support'], ['English', 'Hindi'], .88),
    ]
    changes = []
    for id, name, locality, lat, lng, skills, languages, reliability in volunteers:
        volunteer = Volunteer(id='vol-' + id, name=name, email=id + '@example.org', locality=locality,
            coordinates={'lat':lat, 'lng':lng}, skills=skills, languages=languages,
            availability='available', reliability_score=reliability)
        changes.append(change('volunteers', volunteer))
    reports = [
        ('medical', 9, 12, 'Adyar', 13.0067, 80.2573, 'Urgent medical support at Adyar relief camp', 'Children and elderly residents need first aid and medical support at the community relief camp.', ['first-aid', 'medical-support'], ['First-aid kits', 'Sterile dressings', 'Drinking water']),
        ('food', 7, 48, 'Velachery', 12.981, 80.218, 'Meals needed for families displaced by flooding', '48 people sheltering at the Velachery community centre need warm meals and dry rations.', ['distribution', 'coordination'], ['Meal packets', 'Dry rations', 'Reusable utensils']),
        ('shelter', 8, 26, 'Mylapore', 13.033, 80.267, 'Temporary shelter for flood-affected residents', '26 residents need dry bedding and temporary shelter after water entered their homes.', ['logistics', 'coordination'], ['Blankets', 'Sleeping mats', 'Tarpaulins']),
        ('water', 6, 64, 'Guindy', 13.006, 80.212, 'Clean drinking water at the Guindy shelter', 'Water supply is interrupted. 64 people need sealed drinking water and containers.', ['distribution', 'logistics'], ['Sealed drinking water', 'Clean containers']),
        ('education', 4, 18, 'Thiruvanmiyur', 12.984, 80.259, 'Learning kits for children at the relief centre', '18 children need learning materials and a supervised activity space.', ['teaching', 'community-outreach'], ['Notebooks', 'Pencils', 'Activity kits']),
        ('food', 5, 32, 'T. Nagar', 13.041, 80.234, 'Coordinate evening meal distribution', 'Prepare an evening food distribution point for 32 residents.', ['distribution', 'coordination'], ['Meal packets', 'Serving supplies']),
    ]
    for i,(category, urgency, people, locality, lat, lng, title, text, skills, supplies) in enumerate(reports):
        need = NeedReport(id=f'need-demo-{i+1}', source_type=['text','voice','image'][i%3], original_text=text,
            reporter_name=['Kavya S.', 'Manoj R.', 'Lakshmi P.'][i%3],
            extraction=NeedExtraction(category=category, urgency_level=urgency, people_affected=people,
                location_label=locality, required_skills=skills, summary=title, coordinates={'lat':lat,'lng':lng}, suggested_supplies=supplies),
            created_at=datetime.now(timezone.utc)-timedelta(minutes=12+i*18), priority_score=urgency*1.5,
            source_summary='Synthetic scenario for demonstration', processing_mode='demo')
        changes.append(change('needs',need))
    repository.write(changes)
