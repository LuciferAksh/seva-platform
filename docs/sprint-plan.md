# SEVA 4-Day Sprint Plan

## Team Goal

Deliver a polished, believable demo where messy field input becomes a live, actionable volunteer response in under 60 seconds.

## Non-Negotiable MVP

- One working upload flow for voice, image, and text
- Structured need extraction
- Coordinator map and queue
- Volunteer match recommendation with explanation
- Completion update

Everything else is secondary.

## Day 1: AI Intake and Core Data Model

### Person 1

- Build FastAPI upload endpoints
- Save files to Cloud Storage
- Emit Pub/Sub events

### Person 2

- Build transcription plus OCR pipeline
- Define extraction JSON schema for Gemini
- Normalize output into a single need record

### Person 3

- Set up Cloud SQL PostgreSQL
- Create initial schema
- Add Firebase Auth and backend auth middleware

### Person 4

- Create React frontend shell
- Build field worker submission page
- Build dashboard layout shell

End-of-day milestone:

One uploaded sample should become one saved structured need in the database.

## Day 2: Matching and Live Operations View

### Person 1

- Implement urgency scoring and decay
- Add deduplication or clustering logic

### Person 2

- Implement volunteer matching with weighted scoring
- Add human-readable explanation strings

### Person 3

- Build APIs for needs, volunteers, assignments, and completion logs
- Seed demo data

### Person 4

- Build heatmap or clustered map view
- Build need cards and volunteer recommendation cards

End-of-day milestone:

A structured need should appear on the map and show a recommended volunteer.

## Day 3: Demo Loop and Reliability

### Full Team

- Tighten end-to-end latency
- Add fallback handling for extraction failures
- polish mobile UX
- improve visual clarity
- test the main demo flow repeatedly

Specific goals:

- Report submitted
- Need visible on map
- Volunteer matched
- Assignment accepted
- Completion submitted

End-of-day milestone:

The full story should work live from start to finish.

## Day 4: Submission, Story, and Polish

### Person 1

- Generate impact summary logic
- Create one polished donor or NGO summary panel

### Person 2

- Improve accessibility
- tighten error states and labels

### Person 3

- Deploy backend and database config
- verify logs, environment variables, and API health

### Person 4

- Record demo video
- finalize README
- prepare screenshots and submission text

End-of-day milestone:

Submission assets complete and demo stable.

## Daily Standup Questions

Ask these every morning:

1. What is the one blocker that could slow the demo path?
2. What can be cut without hurting the core story?
3. What must be working by tonight?

## Kill List If Time Runs Out

Cut these first:

- advanced learning from volunteer rejections
- multi-org support
- fancy analytics pages
- PDF exports
- complex notification systems

Do not cut:

- ingestion
- structuring
- map
- matching

## Demo Discipline

Use fixed seed data and pre-tested sample inputs.

Have at least:

- 2 voice notes
- 2 handwritten forms
- 3 volunteers
- 6 needs across 2 to 3 neighborhoods

Your live demo should look dynamic, but it should never depend on luck.
