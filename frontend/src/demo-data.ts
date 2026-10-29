import type { Snapshot } from './types';
export const initialDemo: Snapshot = {
  "needs": [
    {
      "id": "need-demo-1",
      "source_type": "text",
      "original_text": "Children and elderly residents need first aid and medical support at the community relief camp.",
      "reporter_name": "Kavya S.",
      "extraction": {
        "category": "medical",
        "urgency_level": 9,
        "people_affected": 12,
        "location_label": "Adyar",
        "required_skills": [
          "first-aid",
          "medical-support"
        ],
        "summary": "Urgent medical support at Adyar relief camp",
        "coordinates": {
          "lat": 13.0067,
          "lng": 80.2573
        },
        "suggested_supplies": [
          "First-aid kits",
          "Sterile dressings",
          "Drinking water"
        ],
        "facility_type_needed": null,
        "nearby_facilities": []
      },
      "created_at": "2026-10-29T11:36:56.323527Z",
      "priority_score": 13.5,
      "status": "new",
      "media_uri": null,
      "source_summary": "Synthetic scenario for demonstration",
      "processing_mode": "demo",
      "submitted_by": null,
      "submission_id": null
    },
    {
      "id": "need-demo-2",
      "source_type": "voice",
      "original_text": "48 people sheltering at the Velachery community centre need warm meals and dry rations.",
      "reporter_name": "Manoj R.",
      "extraction": {
        "category": "food",
        "urgency_level": 7,
        "people_affected": 48,
        "location_label": "Velachery",
        "required_skills": [
          "distribution",
          "coordination"
        ],
        "summary": "Meals needed for families displaced by flooding",
        "coordinates": {
          "lat": 12.981,
          "lng": 80.218
        },
        "suggested_supplies": [
          "Meal packets",
          "Dry rations",
          "Reusable utensils"
        ],
        "facility_type_needed": null,
        "nearby_facilities": []
      },
      "created_at": "2026-10-29T11:18:56.323915Z",
      "priority_score": 10.5,
      "status": "new",
      "media_uri": null,
      "source_summary": "Synthetic scenario for demonstration",
      "processing_mode": "demo",
      "submitted_by": null,
      "submission_id": null
    },
    {
      "id": "need-demo-3",
      "source_type": "image",
      "original_text": "26 residents need dry bedding and temporary shelter after water entered their homes.",
      "reporter_name": "Lakshmi P.",
      "extraction": {
        "category": "shelter",
        "urgency_level": 8,
        "people_affected": 26,
        "location_label": "Mylapore",
        "required_skills": [
          "logistics",
          "coordination"
        ],
        "summary": "Temporary shelter for flood-affected residents",
        "coordinates": {
          "lat": 13.033,
          "lng": 80.267
        },
        "suggested_supplies": [
          "Blankets",
          "Sleeping mats",
          "Tarpaulins"
        ],
        "facility_type_needed": null,
        "nearby_facilities": []
      },
      "created_at": "2026-10-29T11:00:56.323937Z",
      "priority_score": 12.0,
      "status": "new",
      "media_uri": null,
      "source_summary": "Synthetic scenario for demonstration",
      "processing_mode": "demo",
      "submitted_by": null,
      "submission_id": null
    },
    {
      "id": "need-demo-4",
      "source_type": "text",
      "original_text": "Water supply is interrupted. 64 people need sealed drinking water and containers.",
      "reporter_name": "Kavya S.",
      "extraction": {
        "category": "water",
        "urgency_level": 6,
        "people_affected": 64,
        "location_label": "Guindy",
        "required_skills": [
          "distribution",
          "logistics"
        ],
        "summary": "Clean drinking water at the Guindy shelter",
        "coordinates": {
          "lat": 13.006,
          "lng": 80.212
        },
        "suggested_supplies": [
          "Sealed drinking water",
          "Clean containers"
        ],
        "facility_type_needed": null,
        "nearby_facilities": []
      },
      "created_at": "2026-10-29T10:42:56.323950Z",
      "priority_score": 9.0,
      "status": "new",
      "media_uri": null,
      "source_summary": "Synthetic scenario for demonstration",
      "processing_mode": "demo",
      "submitted_by": null,
      "submission_id": null
    },
    {
      "id": "need-demo-5",
      "source_type": "voice",
      "original_text": "18 children need learning materials and a supervised activity space.",
      "reporter_name": "Manoj R.",
      "extraction": {
        "category": "education",
        "urgency_level": 4,
        "people_affected": 18,
        "location_label": "Thiruvanmiyur",
        "required_skills": [
          "teaching",
          "community-outreach"
        ],
        "summary": "Learning kits for children at the relief centre",
        "coordinates": {
          "lat": 12.984,
          "lng": 80.259
        },
        "suggested_supplies": [
          "Notebooks",
          "Pencils",
          "Activity kits"
        ],
        "facility_type_needed": null,
        "nearby_facilities": []
      },
      "created_at": "2026-10-29T10:24:56.323962Z",
      "priority_score": 6.0,
      "status": "new",
      "media_uri": null,
      "source_summary": "Synthetic scenario for demonstration",
      "processing_mode": "demo",
      "submitted_by": null,
      "submission_id": null
    },
    {
      "id": "need-demo-6",
      "source_type": "image",
      "original_text": "Prepare an evening food distribution point for 32 residents.",
      "reporter_name": "Lakshmi P.",
      "extraction": {
        "category": "food",
        "urgency_level": 5,
        "people_affected": 32,
        "location_label": "T. Nagar",
        "required_skills": [
          "distribution",
          "coordination"
        ],
        "summary": "Coordinate evening meal distribution",
        "coordinates": {
          "lat": 13.041,
          "lng": 80.234
        },
        "suggested_supplies": [
          "Meal packets",
          "Serving supplies"
        ],
        "facility_type_needed": null,
        "nearby_facilities": []
      },
      "created_at": "2026-10-29T10:06:56.323974Z",
      "priority_score": 7.5,
      "status": "new",
      "media_uri": null,
      "source_summary": "Synthetic scenario for demonstration",
      "processing_mode": "demo",
      "submitted_by": null,
      "submission_id": null
    }
  ],
  "volunteers": [
    {
      "id": "vol-asha",
      "name": "Asha Verma",
      "email": "asha@example.org",
      "phone": null,
      "locality": "Adyar",
      "coordinates": {
        "lat": 13.0067,
        "lng": 80.2573
      },
      "skills": [
        "distribution",
        "coordination"
      ],
      "languages": [
        "English",
        "Tamil"
      ],
      "availability": "available",
      "reliability_score": 0.96
    },
    {
      "id": "vol-rohan",
      "name": "Rohan Mehta",
      "email": "rohan@example.org",
      "phone": null,
      "locality": "Mylapore",
      "coordinates": {
        "lat": 13.033,
        "lng": 80.267
      },
      "skills": [
        "first-aid",
        "medical-support"
      ],
      "languages": [
        "English",
        "Hindi"
      ],
      "availability": "available",
      "reliability_score": 0.94
    },
    {
      "id": "vol-priya",
      "name": "Priya Nair",
      "email": "priya@example.org",
      "phone": null,
      "locality": "Velachery",
      "coordinates": {
        "lat": 12.981,
        "lng": 80.218
      },
      "skills": [
        "logistics",
        "coordination"
      ],
      "languages": [
        "English",
        "Tamil"
      ],
      "availability": "available",
      "reliability_score": 0.92
    },
    {
      "id": "vol-arjun",
      "name": "Arjun Kumar",
      "email": "arjun@example.org",
      "phone": null,
      "locality": "T. Nagar",
      "coordinates": {
        "lat": 13.041,
        "lng": 80.234
      },
      "skills": [
        "distribution",
        "logistics"
      ],
      "languages": [
        "English",
        "Tamil"
      ],
      "availability": "available",
      "reliability_score": 0.9
    },
    {
      "id": "vol-meera",
      "name": "Meera Iyer",
      "email": "meera@example.org",
      "phone": null,
      "locality": "Thiruvanmiyur",
      "coordinates": {
        "lat": 12.984,
        "lng": 80.259
      },
      "skills": [
        "teaching",
        "community-outreach"
      ],
      "languages": [
        "English",
        "Tamil"
      ],
      "availability": "available",
      "reliability_score": 0.95
    },
    {
      "id": "vol-dev",
      "name": "Dev Patel",
      "email": "dev@example.org",
      "phone": null,
      "locality": "Guindy",
      "coordinates": {
        "lat": 13.006,
        "lng": 80.212
      },
      "skills": [
        "first-aid",
        "medical-support"
      ],
      "languages": [
        "English",
        "Hindi"
      ],
      "availability": "available",
      "reliability_score": 0.88
    }
  ],
  "assignments": [],
  "completions": [],
  "summary": {
    "active_needs": 6,
    "assigned_needs": 0,
    "completed_needs": 0,
    "active_volunteers": 6,
    "families_impacted": 0,
    "people_helped": 0,
    "pending_reviews": 0
  },
  "mode": "demo",
  "total_needs": 6,
  "ai_enabled": false
};
