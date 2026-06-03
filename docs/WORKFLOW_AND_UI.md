# Workflow and UI Direction

The operator interface should stay practical and calm. The main user is a
volunteer who needs to run the service without technical friction.

## Operator Screen

Recommended layout:

- Left: service program in order.
- Center: selected item slides and large live controls.
- Right: live status, next slide, outputs, and settings.

Priority improvements:

1. Make the live state unmistakable: what is on the audience screen now.
2. Make the next action obvious: next slide, idle background, or next program item.
3. Add clear program editing: add song, prayer, sermon, presentation, video.
4. Add a settings area for screen launch, idle background, and backup/export.
5. Keep controls large and predictable for repeated use.

## Audience Screen

- Shows only the active content.
- Shows the idle background only when output is blank.
- Never shows browser chrome when launched with `npm run screen:main`.

## Stage Screen

- Current slide should be dominant.
- Next slide should be visible but secondary.
- Notes and clock stay available for singers and speakers.

## Future Presenter Screen

Route idea: `/presenter`

- Very large Next and Back controls.
- Keyboard support for remote clickers.
- Optional view of current and next slide.
