export interface ChangelogEntry {
    version: string
    date: string
    title: string
    changes: {
        type: 'new' | 'fix' | 'improvement'
        description: string
    }[]
}

export const changelogs: ChangelogEntry[] = [
    {
        version: "0.5.4",
        date: "2026-01-09",
        title: "changelog.v054.title",
        changes: [
            { type: "new", description: "changelog.v054.board" },
            { type: "new", description: "changelog.v054.command" },
            { type: "new", description: "changelog.v054.focus" },
            { type: "improvement", description: "changelog.v054.sidebar" },
        ]
    },
    {
        version: "0.5.3",
        date: "2026-01-09",
        title: "changelog.v053.title",
        changes: [
            { type: 'improvement', description: "changelog.v053.perf" },
            { type: 'improvement', description: "changelog.v053.cache" },
            { type: 'new', description: "changelog.v053.lazy" },
            { type: 'improvement', description: "changelog.v053.images" }
        ]
    },
    {
        version: "0.5.2",
        date: "2026-01-09",
        title: "changelog.v052.title",
        changes: [
            { type: 'new', description: "changelog.v052.revision" },
            { type: 'improvement', description: "changelog.v052.edit" },
            { type: 'new', description: "changelog.v052.vscode" },
            { type: 'fix', description: "changelog.v052.pptx" },
            { type: 'fix', description: "changelog.v052.ui" }
        ]
    },
    {
        version: "0.5.1",
        date: "2026-01-08",
        title: "changelog.v051.title",
        changes: [
            { type: 'improvement', description: "changelog.v051.mobile" },
            { type: 'improvement', description: "changelog.v051.folders" },
            { type: 'new', description: "changelog.v051.office" },
            { type: 'fix', description: "changelog.v051.api" },
            { type: 'improvement', description: "changelog.v051.polish" }
        ]
    },
    {
        version: "0.5.0",
        date: "2026-01-07",
        title: "changelog.v050.title",
        changes: [
            { type: 'fix', description: "changelog.v050.api_keys" },
            { type: 'fix', description: "changelog.v050.logout" },
            { type: 'fix', description: "changelog.v050.ai_reliability" },
            { type: 'improvement', description: "changelog.v050.polish" }
        ]
    },
    {
        version: "0.4.1",
        date: "2026-01-06",
        title: "changelog.v041.title",
        changes: [
            { type: 'new', description: "changelog.v041.viewer" },
            { type: 'improvement', description: "changelog.v041.metadata" },
            { type: 'fix', description: "changelog.v041.delete_fix" },
            { type: 'fix', description: "changelog.v041.doc_type" }
        ]
    },
    {
        version: "0.4.0",
        date: "2026-01-04",
        title: "changelog.v040.title",
        changes: [
            { type: 'fix', description: "changelog.v040.infra" },
            { type: 'fix', description: "changelog.v040.upload" },
            { type: 'fix', description: "changelog.v040.schema" },
            { type: 'improvement', description: "changelog.v040.speed" },
            { type: 'improvement', description: "changelog.v040.cleanup" },
            { type: 'improvement', description: "changelog.v040.tombstone" },
            { type: 'fix', description: "changelog.v040.nginx" }
        ]
    },
    {
        version: "0.3.0",
        date: "2026-01-01",
        title: "changelog.v030.title",
        changes: [
            { type: 'new', description: "changelog.v030.focus" },
            { type: 'new', description: "changelog.v030.multilang" },
            { type: 'new', description: "changelog.v030.ai2" },
            { type: 'improvement', description: "changelog.v030.export" }
        ]
    },
    {
        version: "0.2.0",
        date: "2026-01-01",
        title: "changelog.v020.title",
        changes: [
            { type: 'new', description: "changelog.v020.pdf" },
            { type: 'new', description: "changelog.v020.command" },
            { type: 'improvement', description: "changelog.v020.analytics" },
            { type: 'fix', description: "changelog.v020.large_files" }
        ]
    },
    {
        version: "0.1.5",
        date: "2025-12-31",
        title: "changelog.v015.title",
        changes: [
            { type: 'new', description: "changelog.v015.recursive" },
            { type: 'new', description: "changelog.v015.favorites" },
            { type: 'improvement', description: "changelog.v015.dnd" }
        ]
    },
    {
        version: "0.1.0",
        date: "2025-12-30",
        title: "changelog.v010.title",
        changes: [
            { type: 'new', description: "changelog.v010.engine" },
            { type: 'new', description: "changelog.v010.graph" }
        ]
    }
]
