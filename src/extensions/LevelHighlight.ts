import { Mark, mergeAttributes } from '@tiptap/core'

export interface LevelHighlightOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    levelHighlight: {
      setLevelHighlight: (attributes?: { color?: string; type?: string }) => ReturnType
      unsetLevelHighlight: () => ReturnType
    }
  }
}

export const LevelHighlight = Mark.create<LevelHighlightOptions>({
  name: 'levelHighlight',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      color: {
        default: 'invalid',
        parseHTML: element => element.getAttribute('data-color'),
        renderHTML: attributes => ({
          'data-color': attributes.color,
        }),
      },
      type: {
        default: 'level',
        parseHTML: element => element.getAttribute('data-type'),
        renderHTML: attributes => ({
          'data-type': attributes.type,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-level-highlight]',
      },
    ]
  },

  renderHTML({ mark, HTMLAttributes }) {
    const colorClass = mark.attrs.color === 'invalid'
      ? 'bg-editor-highlight-invalid'
      : 'bg-editor-highlight-search'

    return [
      'span',
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        {
          'data-level-highlight': '',
          'data-color': mark.attrs.color,
          'data-type': mark.attrs.type,
          class: colorClass,
        }
      ),
      0,
    ]
  },

  addCommands() {
    return {
      setLevelHighlight:
        (attributes = {}) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes)
        },
      unsetLevelHighlight:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        },
    }
  },
})
