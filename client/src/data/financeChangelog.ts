import { ChangelogEntry } from './changelog';

export const financeChangelogs: ChangelogEntry[] = [
    {
        version: "2.0.0",
        date: "2026-01-23",
        title: "finance.changelog.v200.title",
        changes: [
            { type: "new", description: "finance.changelog.v200.hub" },
            { type: "new", description: "finance.changelog.v200.cloud" },
            { type: "improvement", description: "finance.changelog.v200.ui" },
            { type: "fix", description: "finance.changelog.v200.precision" }
        ]
    }
];
