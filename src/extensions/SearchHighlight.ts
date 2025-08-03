import { Mark, mergeAttributes } from '@tiptap/core'

export interface SearchHighlightOptions {
  multicolor: boolean
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    searchHighlight: {
      setSearchHighlight: (attributes?: { color?: string; type?: string }) => ReturnType
      unsetSearchHighlight: () => ReturnType
    }
  }
}

export const SearchHighlight = Mark.create<SearchHighlightOptions>({
  name: 'searchHighlight',

  addOptions() {
    return {
      multicolor: true,
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      color: {
        default: 'search',
        parseHTML: element => element.getAttribute('data-color'),
        renderHTML: attributes => ({
          'data-color': attributes.color,
        }),
      },
      type: {
        default: 'search',
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
        tag: 'span[data-search-highlight]',
      },
    ]
  },

  renderHTML({ mark, HTMLAttributes }) {
    const colorClass = mark.attrs.color === 'replace' 
      ? 'bg-editor-highlight-replace' 
      : mark.attrs.color === 'current'
      ? 'bg-editor-highlight-current'
      : 'bg-editor-highlight-search'
    
    return [
      'span',
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        {
          'data-search-highlight': '',
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
      setSearchHighlight:
        (attributes = {}) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes)
        },
      unsetSearchHighlight:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        },
    }
  },
})