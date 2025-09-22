I couldn’t have built this app to its current level in 4 days without AI. By a conservative estimate, it would have taken me, at least, 4 to 5 months of 5 hours work per day to get this application to its current level.

I utilized AI at every stage of development: to brainstorm architecture decisions, to scaffold initial files and folders for the app, to generate code, to generate documentation, and to review code.

I'll delve into what worked well, what felt limiting, and what I learned while building this app below.

## What Worked Well
- Brainstorming architectural decisions with not just ChatGPT, but also Claude, helped me choose the right stack for the job.
- Creating an AGENTS.md file right at the onset helped to reduce AI hallucinations greatly.
- Using context7 MCP quickened my development time by reducing hallucinations when generating code.
- When I attempted migrating from Dexie to PouchDB, breaking this complex task into granular steps and saving these steps in a markdown file helped AI understand what I wanted it to do and to track what it had done so far.

## What Felt Limiting
- I wasn’t familiar with some of the technologies I had to choose for my tech stack. Though AI assisted with debugging code, my unfamiliarity with syntax felt limiting at various points.
- I wish I had more time to build out more features before submission. However, I can always add features after submission.

## My learnings (about prompting, reviewing, and iterating)
- Use version control obsessively. Commit everything. It’s easier to rollback to the last commit before you started implementing this "elusive" feature than to start all over again.<br><br>
Committing your codebase after every **working feature implementation** or bug fix creates checkpoints in time that you can easily revert to. Unfortunately, AI in IDEs cannot yet do automatic version control.
- When prompting, prompt in steps. This is more important when trying to implement something complex.<br>
For example, a database migration. Tell the AI what you want to do (e.g., move from Dexie to PouchDB). Tell it to outline each step you’ll need to take to properly implement this migration to the tiniest detail, and tell it to save these steps into a DATABASE_MIGRATION.md file.<br>
Furthermore, you can tell it to split these steps into phases (e.g., Phase 1, Phase 2). Then you can tell it to implement Phase 1 as outlined in DATABASE_MIGRATION.md, injecting the created markdown file as context.
- Use one AI tool only for code generation. I find that this makes debugging easier and ensures that the AI tool enough context to help with debugging.
- Be specific in your prompts. Tell the AI exactly what you want it to do and let it know that that is only what it should do.
