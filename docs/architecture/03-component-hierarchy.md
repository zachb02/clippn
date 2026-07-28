# Component Hierarchy

## Marketing site (`app/(marketing)/`)

```
RootLayout
└─ MarketingLayout
   ├─ SiteNav (logo, nav links, "Sign in" / "Create a video" CTA)
   ├─ page.tsx (/)
   │  ├─ Hero (headline, dual CTA, InteractiveEditorPreview)
   │  ├─ BeforeAfterShowcase
   │  ├─ WorkflowCardGrid (Auto Clip, Split Screen, Story, Chat, Streamer, Idea-to-Short)
   │  ├─ ToolDirectoryTeaser
   │  ├─ ThreeStepExplainer (Upload/Idea → Generate/Customize → Export)
   │  ├─ BringYourOwnKeyExplainer
   │  ├─ LocalProcessingExplainer
   │  ├─ PrivacySection
   │  ├─ UseCaseGrid
   │  ├─ FAQAccordion
   │  └─ SiteFooter (product/resources/support/legal columns)
   ├─ features/page.tsx
   ├─ templates/page.tsx (public gallery preview)
   ├─ tools/page.tsx (ToolDirectoryFull)
   ├─ tools/[tool]/page.tsx → ToolWorkspace (anonymous-capable)
   ├─ support/, privacy/, terms/, acceptable-use/, copyright/,
   │  likeness-removal/, data-deletion/ → LegalDocLayout + MDX-ish content
   └─ (auth)/login, signup, forgot-password, reset-password → AuthCard
```

## Anonymous tool workspace (shared by `/tools/*` and pre-login use)

```
ToolWorkspace
├─ DropZone (drag/drop or file picker; keyboard accessible)
├─ MediaPreviewPlayer (canvas/video element)
├─ ToolControlPanel (tool-specific: TrimControls, CropControls, ...)
├─ ExportBar (format/preset picker, "Export" — never gated)
├─ UnsavedWorkWarning (beforeunload prompt + "Create free account to save")
└─ ProcessingOverlay (progress, cancel)
```

## Authenticated app shell (`app/(app)/app/layout.tsx`)

```
AppShell
├─ Sidebar (collapsible)
│  ├─ ProjectSwitcher
│  ├─ NewProjectButton
│  ├─ NavList: Home · Projects · Create · Auto Clip · Templates · Editor ·
│  │            Assets · AI Tools · Audio Tools · Social Tracker · Settings
│  ├─ ProviderStatusMini (connected providers, no plan/credit info)
│  └─ RenderQueueMini
├─ TopBar (search, NotificationsMenu, AccountMenu)
└─ <page content>
   ├─ app/page.tsx → HomeDashboard
   ├─ app/projects/page.tsx → ProjectDashboard
   │  ├─ ViewToggle (grid/list)
   │  ├─ FilterBar (workflow, status)
   │  ├─ ProjectCard[] (thumbnail, duration, aspect ratio, status badge)
   │  └─ ProjectCardMenu (duplicate/rename/archive/delete/open)
   ├─ app/projects/[id]/page.tsx → ProjectDetail (shell in Phase 1)
   └─ app/settings/providers/page.tsx → ProviderConnectionsPage
      ├─ ConnectionForm (provider select, label, api-key field, storage-mode radio,
      │  test-connection button, save)
      └─ ConnectionCard[] (masked key, status badge, capabilities, retest/replace/
         rotate/disconnect/delete)
```

## Future editor shell (Phase 5, designed now, not built)

```
EditorShell
├─ AssetPanel (left)
├─ PreviewCanvas (center) — WebGL/Canvas compositor reading the render spec
├─ PropertiesPanel (right) — per-selected-clip transform/effects/captions
├─ Timeline (bottom) — multi-track, virtualized, per 07-timeline-json-schema.md
└─ TopToolbar (undo/redo, render button, keyboard-shortcut help)
```

## Cross-cutting primitives (shadcn/ui-based, original styling)

`Button`, `Input`, `Textarea`, `Select`, `Dialog`, `Sheet`, `DropdownMenu`, `Tabs`,
`Tooltip`, `Toast`, `Badge`, `Progress`, `Skeleton`, `Card` — themed to Clippn's
palette/type in `globals.css` + `tailwind.config`, never left in shadcn default styling
(per the anti-generic-slop design direction).
