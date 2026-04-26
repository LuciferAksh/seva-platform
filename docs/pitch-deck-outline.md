# SEVA Pitch Deck Outline

## Slide 1: Title

SEVA  
Scalable Emergency Volunteer Activator

Tagline:

`Turning chaotic community signals into coordinated humanitarian action`

## Slide 2: Problem

Local NGOs collect critical ground-level data, but it is often trapped in:

- WhatsApp voice notes
- handwritten survey sheets
- unstructured field reports
- fragmented forms

As a result:

- urgent needs are missed
- coordinators lack a live view of reality
- volunteers are not deployed efficiently

## Slide 3: Why This Matters

- slow response costs real lives and real opportunities
- small NGOs have the data, but not the intelligence layer
- vulnerable communities are underserved when coordination breaks down

## Slide 4: Our Solution

SEVA ingests voice, image, and text reports, extracts structured needs, prioritizes them on a live map, and matches volunteers to the right tasks with explainable AI.

## Slide 5: How It Works

1. Field worker uploads voice note, survey photo, or text
2. AI extracts location, urgency, category, and people affected
3. Dashboard shows live need hotspots
4. SEVA recommends best-fit volunteers
5. Volunteer completes task and impact is logged

## Slide 6: Tech Innovation

- multimodal ingestion
- structured extraction using Vertex AI Gemini
- OCR for handwritten forms
- explainable volunteer matching
- real-time operational dashboard

Important phrasing:

`This is not a chatbot wrapper. This is an operational decision system for real-world social response.`

## Slide 7: Google Cloud Stack

- Vertex AI Gemini 2.5 Flash for extraction
- Gemini 2.5 Pro for impact summarization
- Speech-to-Text for voice transcription
- Document AI for handwritten OCR
- Cloud Run for backend services
- Cloud SQL PostgreSQL with pgvector
- Firebase Authentication
- Cloud Storage and Pub/Sub

## Slide 8: Social Impact

SEVA helps NGOs:

- detect urgent local needs faster
- allocate limited volunteers smarter
- reduce coordination delays
- generate measurable impact evidence

## Slide 9: Demo Story

Example:

Flood-affected neighborhood in Chennai.

A field worker sends a voice note and a photo of a handwritten relief sheet. SEVA detects food and medical needs, identifies a hotspot, matches nearby volunteers, and logs assistance within minutes.

## Slide 10: Scalability

- usable by grassroots NGOs with low digital maturity
- supports multilingual inputs
- adaptable to floods, food drives, health camps, and education outreach
- scalable with serverless Google Cloud components

## Slide 11: Why We Can Execute

- lean MVP
- clean division of responsibilities across 4 team members
- rapid deployment using managed cloud services
- strong focus on demo reliability

## Slide 12: Closing

`SEVA helps organizations hear the community clearly and respond with precision.`

Optional final line:

`When help is delayed by messy data, AI should not create more complexity. It should create clarity.`
