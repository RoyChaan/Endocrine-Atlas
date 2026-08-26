# Endocrine Atlas — Implementation Prompt

## 0. Role

You are the primary coding agent responsible for implementing a small educational web application.

Build the project end-to-end. Do not over-engineer it.

The application is a **junior-high-school-level interactive endocrine gland anatomy viewer**.

The main interaction is:

> Select gland → camera focuses on gland → gland is highlighted → user can horizontally rotate the 3D view → knowledge card appears on the right.

The project must be visually polished enough for a classroom demonstration, but **do not attempt medical-grade anatomical realism**.

---

# 1. Product Goal

Build a web page similar in interaction style to `thebuggeddev/anatomy`, but specifically for the **human endocrine glands**.

The attached reference image should be treated as the primary visual/product reference:

* Human body shown as a simplified translucent silhouette
* Endocrine glands highlighted at approximately correct anatomical positions
* Labels / knowledge cards associated with each gland
* User can select a gland
* Selected gland becomes visually prominent
* Camera smoothly focuses on the selected gland
* User can rotate the body horizontally to understand its 3D position
* Information card appears beside the model

Reference image:

`/mnt/data/c0e25fcb-3b15-4fba-a3d2-5b5f720e5c7b.png`

Use this image as a visual reference only. Do not reproduce it pixel-for-pixel.

---

# 2. Extremely Important Scope Constraint

This is a **1.5-week project**.

Do NOT add unnecessary complexity.

The MVP does NOT need:

* Medical-grade anatomical models
* Realistic human skin
* Realistic female anatomy
* Detailed organs
* Skeletal system
* Blood vessels
* Muscles
* Complex endocrine pathways
* Hormone feedback loops
* Disease simulation
* AI chatbot
* Backend
* Database
* User accounts
* Authentication
* CMS
* Search engine
* Complex animations
* WebGL shaders unless genuinely useful
* Physics
* Multiplayer
* Mobile app

The goal is an interactive educational visualization, not a medical simulator.

---

# 3. Recommended Technology Stack

Use the simplest stack that can reliably be completed within 1.5 weeks.

## Required

* Vite
* React
* TypeScript
* Three.js
* React Three Fiber
* Drei

Recommended:

```text
Vite
React
TypeScript
Three.js
@react-three/fiber
@react-three/drei
```

Do NOT introduce Next.js unless the existing repository already uses it.

This is a static educational visualization. There is no need for SSR.

Avoid unnecessary dependencies.

For animations, prefer simple interpolation / `useFrame` rather than adding another animation library unless there is a strong reason.

---

# 4. Critical Asset Strategy

## Do NOT make the project depend on external 3D human anatomy assets.

For this MVP, construct the human body using simple Three.js primitives.

The body should look like a:

> semi-transparent anatomical mannequin / silhouette

rather than a realistic human.

Use simple primitives such as:

* Sphere
* Capsule
* Cylinder
* Rounded box
* Ellipsoid
* Torus where appropriate

Example conceptual structure:

```text
                Head
                 ○
                 │
          translucent neck
                 │
              torso
             /     \
          arm       arm
             │     │
             │     │
            leg   leg
```

The human body should be translucent and visually subordinate to the endocrine glands.

The glands should be more visually prominent.

---

# 5. Anatomical Representation

The body does NOT need to be medically detailed.

The following anatomical positions need to be approximately correct:

| Gland          | Position                          |
| -------------- | --------------------------------- |
| Pituitary      | Inside the head / brain region    |
| Thyroid        | Front of the neck                 |
| Adrenal glands | Above the kidneys                 |
| Pancreas       | Upper abdomen                     |
| Ovaries        | Lower abdomen / pelvic region     |
| Testes         | Lower pelvic/external region      |
| Hypothalamus   | Inside the brain, above pituitary |

The visual model should communicate **relative location**, not exact anatomy.

---

# 6. Avoid Realistic Female Body Representation

Do not create a realistic female body.

The body should be a neutral translucent mannequin/silhouette.

For female reproductive endocrine organs:

```text
Ovary
```

can simply be represented by two small stylized oval structures inside the lower abdomen/pelvic area.

Do not create realistic breasts, genitalia, skin, facial features, etc.

Similarly, testes can be represented using simple abstract shapes.

The educational purpose is to communicate:

> "where the endocrine gland is located"

not to display realistic human anatomy.

---

# 7. Main Visual Layout

Desktop-first.

Recommended layout:

```text
┌─────────────────────────────────────────────────────────────┐
│  ENDOCRINE ATLAS                              内分泌系统     │
├───────────────────────────────────────┬─────────────────────┤
│                                       │                     │
│                                       │  甲状腺             │
│                                       │  THYROID            │
│              3D BODY                  │                     │
│                                       │  位置               │
│                 ↻                     │  颈部前方           │
│                                       │                     │
│                                       │  分泌               │
│                                       │  甲状腺激素         │
│                                       │                     │
│                                       │  主要作用           │
│                                       │  调节身体的新陈代谢 │
│                                       │                     │
│                                       │  [关闭 / 返回]      │
│                                       │                     │
├───────────────────────────────────────┴─────────────────────┤
│  ← 拖动旋转人体                         点击腺体查看信息     │
└─────────────────────────────────────────────────────────────┘
```

The 3D viewer should occupy approximately 65–70% of the screen.

The information card should occupy approximately 30–35%.

---

# 8. Initial State

When the page loads:

* Show translucent human mannequin
* Show all endocrine glands as small colored markers / stylized shapes
* No gland should be strongly focused
* Camera should show the whole upper body
* Show a short instruction:

```text
点击腺体查看信息
拖动模型可以旋转
```

The user should immediately understand what to do.

---

# 9. Gland Interaction

Every gland must be clickable.

Interaction:

```text
click gland
    ↓
selectedGland = gland.id
    ↓
highlight gland
    ↓
dim other glands slightly
    ↓
smoothly move camera toward gland
    ↓
knowledge card opens
```

Do NOT navigate to another page.

Everything should happen on the same screen.

---

# 10. Focus Camera

This is one of the most important features.

When the user clicks a gland:

```text
Current camera
       ↓
smooth transition
       ↓
selected gland
```

The transition should take approximately:

```text
500–900 ms
```

Do not instantly teleport the camera.

The camera should focus on the selected gland while preserving enough surrounding anatomy to understand its location.

For example:

### Thyroid

Do not zoom so close that the viewer loses the neck/body context.

Instead:

```text
      head
       ○
       │
      🔴  ← thyroid
       │
     torso
```

The viewer should still understand:

> "This is in the neck."

---

# 11. Rotation

The user must be able to rotate the model horizontally.

Use:

```text
OrbitControls
```

Configure it so that:

* Horizontal rotation is enabled
* Zoom is enabled
* Panning is disabled
* Vertical rotation is limited
* The user cannot rotate the body upside down
* The model remains centered

The primary interaction should feel like:

```text
drag left/right
     ↔
rotate human model
```

The user should be able to understand that the glands are located inside the body rather than simply being flat labels.

---

# 12. Focus + Rotation Behavior

After selecting a gland:

```text
selected gland
      ↓
camera focuses
      ↓
user drags horizontally
      ↓
body rotates around vertical axis
```

The selected gland should remain visually identifiable during rotation.

Do not break OrbitControls after camera focusing.

---

# 13. Highlighting

Selected gland:

* brighter
* slightly larger if appropriate
* emissive/glowing effect if simple to implement
* clearly distinguishable from translucent body

Other glands:

* remain visible
* but less visually prominent

Body:

* translucent
* low contrast
* should not compete with glands

Example:

```text
Body:
opacity ≈ 0.10–0.20

Selected gland:
opacity = 1.0

Other glands:
opacity ≈ 0.45–0.65
```

These values are guidelines, not strict requirements.

---

# 14. Gland Representation

Use simple stylized geometry.

Do NOT spend days modeling realistic glands.

Suggested representations:

```text
Pituitary
    small sphere / irregular small blob

Thyroid
    two rounded lobes + central connection

Adrenal
    small flattened triangular/rounded shape

Pancreas
    elongated curved capsule / ellipsoid

Ovary
    small oval

Testis
    small oval

Hypothalamus
    small highlighted region inside brain
```

The important thing is:

> recognizable position + clickable object

not realistic geometry.

---

# 15. Data-Driven Architecture

Do NOT hard-code knowledge content directly inside UI components.

Create a data structure similar to:

```ts
type Gland = {
  id: string
  name: string
  chineseName: string

  position: [number, number, number]

  description: string

  location: string

  hormones: string[]

  functions: string[]

  color: string
}
```

Example:

```ts
{
  id: "thyroid",
  name: "Thyroid",
  chineseName: "甲状腺",

  location: "颈部前方",

  hormones: [
    "甲状腺激素"
  ],

  functions: [
    "帮助调节新陈代谢",
    "参与生长发育"
  ]
}
```

Keep all educational content in:

```text
src/data/glands.ts
```

or equivalent.

This allows the model and UI to remain independent from the educational content.

---

# 16. Educational Content Level

The target audience is:

> 初中生

Therefore the information must be simple.

Each card should contain approximately:

```text
名称

在哪里？
一句话描述位置

分泌什么？
1–2 个主要激素

有什么作用？
1–3 个简单 bullet points
```

Example:

```text
甲状腺
THYROID

📍 在哪里？
位于颈部前方，气管两侧。

🧪 分泌什么？
甲状腺激素

💡 有什么作用？
• 帮助调节新陈代谢
• 参与身体的生长发育
```

Avoid advanced terminology unless necessary.

Do not explain:

* receptor signaling
* HPA axis
* molecular pathways
* second messenger systems
* detailed feedback mechanisms
* biochemical synthesis
* clinical endocrinology

This is an introductory biology visualization.

---

# 17. Knowledge Card Design

The card should be visually clean.

Structure:

```text
┌──────────────────────────┐
│ 甲状腺                    │
│ THYROID                   │
│                          │
│ 📍 位置                  │
│ 颈部前方                  │
│                          │
│ ──────────────────────── │
│                          │
│ 🧪 分泌                  │
│ 甲状腺激素                │
│                          │
│ ──────────────────────── │
│                          │
│ 💡 主要作用              │
│ • 调节新陈代谢            │
│ • 参与生长发育            │
│                          │
└──────────────────────────┘
```

Use Chinese as the primary language.

English names can appear as secondary labels.

---

# 18. Glands for MVP

Implement exactly these first:

1. 下丘脑 Hypothalamus
2. 垂体 Pituitary
3. 甲状腺 Thyroid
4. 肾上腺 Adrenal glands
5. 胰腺 Pancreas
6. 卵巢 Ovaries
7. 睾丸 Testes

Do not add additional glands until these seven work correctly.

---

# 19. Special Handling of Paired Organs

Adrenal glands:

```text
left adrenal
right adrenal
```

should visually appear on both sides.

Ovaries:

```text
left ovary
right ovary
```

should appear on both sides.

Testes can be represented as a separate abstract pair.

However, from the UI perspective, they can still map to one educational entity:

```text
adrenal
ovary
testis
```

This avoids creating unnecessary duplicated knowledge entries.

---

# 20. Body Model

The body is intentionally simplified.

Recommended visual hierarchy:

```text
Human silhouette
    ↓
very low opacity

Internal endocrine glands
    ↓
higher opacity

Selected gland
    ↓
highest visual emphasis
```

The body should communicate:

```text
head
neck
chest
abdomen
pelvis
```

but should not contain realistic anatomy.

A semi-transparent mannequin is preferred.

---

# 21. Visual Style

Target style:

> modern educational interactive visualization

Not:

> medical software

Not:

> realistic 3D game

Suggested visual language:

* dark or neutral background
* translucent body
* simple luminous gland markers
* clean typography
* rounded information cards
* subtle transitions
* restrained colors
* large readable labels

Avoid excessive neon / gaming aesthetics.

The page should feel suitable for a school biology lesson.

---

# 22. UI States

Implement these states:

```text
1. Overview

2. Gland selected

3. Camera focusing

4. Gland focused

5. Card closed / reset
```

Minimum interaction:

```text
Click gland
Click another gland
Drag to rotate
Scroll to zoom
Reset view
```

---

# 23. Reset Button

Add:

```text
重新查看全部
```

or:

```text
Reset View
```

It should:

* deselect gland
* return camera to overview
* show all glands normally
* close or reset knowledge card

---

# 24. Responsive Requirement

Desktop is the priority.

But do not make the page completely unusable on smaller screens.

For widths below approximately 768px:

```text
3D viewer
    ↓
top

knowledge card
    ↓
bottom
```

No need for sophisticated mobile optimization.

---

# 25. Performance

Keep it lightweight.

Because all models are procedural/simple geometry:

* no huge GLB
* no high-resolution textures
* no expensive post-processing
* no unnecessary shadows
* no expensive shaders

The page should load quickly.

Use:

```text
pixelRatio = Math.min(devicePixelRatio, 2)
```

or equivalent.

---

# 26. Project Structure

Recommended:

```text
src/
├── components/
│   ├── AnatomyScene.tsx
│   ├── BodyModel.tsx
│   ├── Gland.tsx
│   ├── GlandSystem.tsx
│   ├── KnowledgeCard.tsx
│   ├── Header.tsx
│   └── ControlsHint.tsx
│
├── data/
│   └── glands.ts
│
├── hooks/
│   └── useCameraFocus.ts
│
├── types/
│   └── gland.ts
│
├── App.tsx
├── main.tsx
└── index.css
```

Keep components small.

Avoid a giant `App.tsx`.

---

# 27. State Architecture

A simple React state is enough.

For example:

```ts
const [selectedGland, setSelectedGland] =
  useState<string | null>(null)
```

Do NOT introduce Redux/Zustand unless the project genuinely requires it.

The state requirements are tiny.

---

# 28. Camera Architecture

Keep camera logic isolated.

For example:

```text
useCameraFocus()

input:
selected gland position

output:
smooth camera transition
```

The camera system should be independent from the knowledge panel.

This means:

```text
selectedGland
       │
       ├──────────────→ KnowledgeCard
       │
       └──────────────→ CameraFocus
```

---

# 29. Important Implementation Principle

The anatomical position should be represented using one consistent coordinate system.

Example:

```text
Y = vertical
X = left/right
Z = front/back
```

All gland positions must use the same coordinate system.

For example:

```ts
thyroid: [0, 1.8, 0.25]

pituitary: [0, 2.45, 0]

adrenalLeft: [-0.28, 0.65, 0]

adrenalRight: [0.28, 0.65, 0]

pancreas: [0, 0.35, 0.15]
```

These numbers are examples only.

Tune them visually.

The important requirement is:

> relative anatomical positioning must make sense.

---

# 30. Don't Fake 3D With 2D Images

Do NOT simply use the provided image as the main interactive layer.

The project must have an actual 3D scene.

The reference image is for:

* layout
* gland positioning
* educational visual hierarchy

The user must be able to rotate the body.

---

# 31. Development Workflow

Do NOT implement everything at once.

Follow this order.

## Phase 1 — Scene

First create:

```text
React
+
R3F
+
Canvas
+
Camera
+
Lights
+
Body mannequin
```

Verify it renders.

---

## Phase 2 — Glands

Add:

```text
7 gland groups
```

Verify anatomical positions.

Do not build the knowledge card yet.

---

## Phase 3 — Interaction

Implement:

```text
click
↓
selectedGland
↓
highlight
```

Then:

```text
selectedGland
↓
camera focus
```

---

## Phase 4 — Rotation

Add/tune:

```text
OrbitControls
```

Make sure:

```text
horizontal rotation
+
limited vertical rotation
+
zoom
```

works correctly.

---

## Phase 5 — Knowledge Card

Connect the existing data model.

Do not duplicate information in the component.

---

## Phase 6 — Polish

Only after all functionality works:

* transitions
* typography
* spacing
* opacity
* highlighting
* responsive layout
* reset button

---

# 32. 1.5-Week Delivery Plan

Assume approximately 7–10 working days.

## Day 1

Project initialization.

Deliver:

```text
Vite
React
TypeScript
R3F
Drei

working development environment
```

---

## Day 2

Build the translucent mannequin.

Deliver:

```text
head
neck
torso
arms
legs
```

No realistic anatomy.

---

## Day 3

Add all seven endocrine gland groups.

Deliver:

```text
correct approximate relative positions
```

---

## Day 4

Implement:

```text
click detection
selected state
highlight
```

---

## Day 5

Implement:

```text
camera focus
smooth transition
reset camera
```

This is a critical milestone.

---

## Day 6

Implement:

```text
OrbitControls
horizontal rotation
zoom
vertical limitation
```

At the end of Day 6, the 3D interaction should be complete.

---

## Day 7

Implement:

```text
knowledge data
knowledge card
```

---

## Day 8

Implement:

```text
overview UI
header
instructions
reset button
responsive layout
```

---

## Day 9

Polish:

```text
highlighting
animations
spacing
typography
colors
camera tuning
```

---

## Day 10

Final QA.

Check every gland:

```text
click
→ highlight
→ focus
→ rotate
→ card
→ reset
```

Fix bugs.

Do not add new features unless the MVP is already stable.

---

# 33. Definition of Done

The project is DONE when all of the following are true.

### 3D

* [ ] Semi-transparent human mannequin exists
* [ ] Seven endocrine gland groups exist
* [ ] Glands are approximately anatomically positioned
* [ ] Scene renders without errors

### Interaction

* [ ] Every gland is clickable
* [ ] Selected gland becomes highlighted
* [ ] Camera smoothly focuses on selected gland
* [ ] User can rotate horizontally
* [ ] User can zoom
* [ ] Vertical rotation is constrained
* [ ] Reset returns to overview

### Education

* [ ] Every gland has a Chinese name
* [ ] Every gland has an English name
* [ ] Every gland has a location
* [ ] Every gland has basic hormone information
* [ ] Every gland has 1–3 basic functions
* [ ] Content is understandable by junior-high-school students

### UI

* [ ] Knowledge card appears after selection
* [ ] Knowledge card is visually readable
* [ ] Selected gland and card correspond correctly
* [ ] Initial page explains how to interact
* [ ] Desktop layout is polished
* [ ] Small-screen layout remains usable

### Engineering

* [ ] TypeScript has no avoidable errors
* [ ] No giant monolithic component
* [ ] Educational content is data-driven
* [ ] No unnecessary backend
* [ ] No external API dependency
* [ ] No huge external 3D assets required
* [ ] `npm run build` succeeds

---

# 34. Explicit Non-Goals

Do NOT implement any of these unless all MVP requirements are already complete:

```text
❌ hormone feedback loops
❌ disease simulation
❌ detailed organ anatomy
❌ realistic human body
❌ realistic female anatomy
❌ AI tutor
❌ backend
❌ database
❌ login
❌ user accounts
❌ multiplayer
❌ advanced WebGL shaders
❌ complex particle systems
❌ medical diagnosis
❌ detailed biochemical mechanisms
```

If you have extra time, spend it on:

```text
1. better camera focus
2. better gland highlighting
3. better visual hierarchy
4. smoother rotation
5. cleaner knowledge cards
```

Do not spend the remaining time on feature expansion.

---

# 35. Final Product Philosophy

The final result should answer three questions immediately:

### ① Where is this gland?

The 3D mannequin answers this.

### ② What does it secrete?

The knowledge card answers this.

### ③ What does it basically do?

The knowledge card answers this.

The primary experience is:

```text
LOOK
 ↓
CLICK
 ↓
FOCUS
 ↓
ROTATE
 ↓
LEARN
```

Keep the implementation simple enough that the entire MVP can be reliably completed within 1.5 weeks.

Prioritize **working interaction > anatomical realism > feature count**.
