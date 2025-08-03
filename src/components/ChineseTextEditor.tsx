import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { SearchHighlight } from '../extensions/SearchHighlight'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent } from './ui/card'
import { Search, Replace, ChevronLeft, ChevronRight } from 'lucide-react'

interface SearchMatch {
  from: number
  to: number
  text: string
}

const ChineseTextEditor: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [replaceQuery, setReplaceQuery] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1)
  const [matches, setMatches] = useState<SearchMatch[]>([])
  const [isReplaceMode, setIsReplaceMode] = useState(false)
  
  const editorRef = useRef<any>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      SearchHighlight,
    ],
    content: `
      <h2>中文文本编辑器</h2>
      <p>这是一个支持中文搜索和替换功能的富文本编辑器。您可以在上方搜索框中输入要查找的中文词汇，编辑器会实时高亮显示所有匹配的内容。</p>
      <p>您也可以使用替换功能来批量或逐个替换文本。例如，尝试搜索"编辑器"或"中文"等词汇。</p>
      <p>这个编辑器使用了 TipTap 和 ProseMirror 技术，确保了良好的编辑体验和文档状态的完整性。</p>
    `,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[300px] p-4',
      },
    },
  })

  // Clear all highlights
  const clearHighlights = useCallback(() => {
    if (!editor) return
    
    const { tr } = editor.state
    let modified = false
    
    editor.state.doc.descendants((node, pos) => {
      if (node.marks) {
        node.marks.forEach(mark => {
          if (mark.type.name === 'searchHighlight') {
            tr.removeMark(pos, pos + node.nodeSize, mark.type)
            modified = true
          }
        })
      }
    })
    
    if (modified) {
      editor.view.dispatch(tr)
    }
  }, [editor])

  // Find all matches for a given query
  const findMatches = useCallback((query: string): SearchMatch[] => {
    if (!editor || !query.trim()) return []
    
    const matches: SearchMatch[] = []
    const doc = editor.state.doc
    const normalizedQuery = query.toLowerCase()
    
    doc.descendants((node, pos) => {
      if (node.isText && node.text) {
        const text = node.text.toLowerCase()
        let index = 0
        
        while (index < text.length) {
          const matchIndex = text.indexOf(normalizedQuery, index)
          if (matchIndex === -1) break
          
          matches.push({
            from: pos + matchIndex,
            to: pos + matchIndex + query.length,
            text: node.text.substring(matchIndex, matchIndex + query.length)
          })
          
          index = matchIndex + 1
        }
      }
    })
    
    return matches
  }, [editor])

  // Highlight all matches
  const highlightMatches = useCallback((matches: SearchMatch[], highlightType: string = 'search') => {
    if (!editor || matches.length === 0) return
    
    const { tr } = editor.state
    
    matches.forEach(match => {
      tr.addMark(
        match.from,
        match.to,
        editor.schema.marks.searchHighlight.create({ 
          color: highlightType,
          type: highlightType 
        })
      )
    })
    
    editor.view.dispatch(tr)
  }, [editor])

  // Handle search
  const handleSearch = useCallback((query: string) => {
    clearHighlights()
    
    if (!query.trim()) {
      setMatches([])
      setCurrentMatchIndex(-1)
      return
    }
    
    const foundMatches = findMatches(query)
    setMatches(foundMatches)
    setCurrentMatchIndex(foundMatches.length > 0 ? 0 : -1)
    
    if (foundMatches.length > 0) {
      highlightMatches(foundMatches, 'search')
      // Highlight current match differently
      if (foundMatches[0]) {
        highlightCurrentMatch(0, foundMatches)
      }
    }
  }, [clearHighlights, findMatches, highlightMatches])

  // Highlight current match
  const highlightCurrentMatch = useCallback((index: number, allMatches: SearchMatch[]) => {
    if (!editor || index < 0 || index >= allMatches.length) return
    
    const { tr } = editor.state
    const currentMatch = allMatches[index]
    
    // First remove current highlight from all matches
    allMatches.forEach(match => {
      tr.removeMark(match.from, match.to, editor.schema.marks.searchHighlight)
      tr.addMark(
        match.from,
        match.to,
        editor.schema.marks.searchHighlight.create({ 
          color: 'search',
          type: 'search' 
        })
      )
    })
    
    // Then highlight current match
    tr.removeMark(currentMatch.from, currentMatch.to, editor.schema.marks.searchHighlight)
    tr.addMark(
      currentMatch.from,
      currentMatch.to,
      editor.schema.marks.searchHighlight.create({ 
        color: 'current',
        type: 'current' 
      })
    )
    
    editor.view.dispatch(tr)
    
    // Scroll to current match
    const pos = editor.view.coordsAtPos(currentMatch.from)
    if (pos) {
      window.scrollTo({
        top: pos.top - window.innerHeight / 2,
        behavior: 'smooth'
      })
    }
  }, [editor])

  // Navigate matches
  const navigateMatch = useCallback((direction: 'next' | 'prev') => {
    if (matches.length === 0) return
    
    let newIndex = currentMatchIndex
    if (direction === 'next') {
      newIndex = (currentMatchIndex + 1) % matches.length
    } else {
      newIndex = currentMatchIndex <= 0 ? matches.length - 1 : currentMatchIndex - 1
    }
    
    setCurrentMatchIndex(newIndex)
    highlightCurrentMatch(newIndex, matches)
  }, [matches, currentMatchIndex, highlightCurrentMatch])

  // Replace all matches
  const replaceAll = useCallback(() => {
    if (!editor || !replaceQuery.trim() || !replaceText.trim()) return
    
    clearHighlights()
    const foundMatches = findMatches(replaceQuery)
    
    if (foundMatches.length === 0) return
    
    const { tr } = editor.state
    
    // Replace from end to start to maintain positions
    for (let i = foundMatches.length - 1; i >= 0; i--) {
      const match = foundMatches[i]
      tr.replaceWith(match.from, match.to, editor.schema.text(replaceText))
    }
    
    editor.view.dispatch(tr)
    
    // Find and highlight new replaced text
    setTimeout(() => {
      const newMatches = findMatches(replaceText)
      if (newMatches.length > 0) {
        highlightMatches(newMatches, 'replace')
      }
    }, 100)
    
    setMatches([])
    setCurrentMatchIndex(-1)
  }, [editor, replaceQuery, replaceText, clearHighlights, findMatches, highlightMatches])

  // Replace current match
  const replaceCurrent = useCallback(() => {
    if (!editor || currentMatchIndex < 0 || currentMatchIndex >= matches.length) return
    
    const currentMatch = matches[currentMatchIndex]
    const { tr } = editor.state
    
    tr.replaceWith(currentMatch.from, currentMatch.to, editor.schema.text(replaceText))
    editor.view.dispatch(tr)
    
    // Update matches list
    setTimeout(() => {
      const newMatches = findMatches(replaceQuery)
      setMatches(newMatches)
      
      // Adjust current index
      let newIndex = currentMatchIndex
      if (newIndex >= newMatches.length) {
        newIndex = newMatches.length > 0 ? 0 : -1
      }
      setCurrentMatchIndex(newIndex)
      
      if (newMatches.length > 0) {
        highlightMatches(newMatches, 'search')
        if (newIndex >= 0) {
          highlightCurrentMatch(newIndex, newMatches)
        }
      }
      
      // Highlight replaced text
      const replacedMatches = findMatches(replaceText)
      if (replacedMatches.length > 0) {
        highlightMatches(replacedMatches, 'replace')
      }
    }, 100)
  }, [editor, currentMatchIndex, matches, replaceText, replaceQuery, findMatches, highlightMatches, highlightCurrentMatch])

  // Effect for search
  useEffect(() => {
    handleSearch(searchQuery)
  }, [searchQuery, handleSearch])

  // Effect for replace query changes
  useEffect(() => {
    if (isReplaceMode) {
      handleSearch(replaceQuery)
    }
  }, [replaceQuery, isReplaceMode, handleSearch])

  if (!editor) {
    return <div>Loading editor...</div>
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-4">
      <Card>
        <CardContent className="p-6 space-y-4">
          {/* Search Bar */}
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索中文词汇..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            {matches.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {currentMatchIndex + 1} / {matches.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMatch('prev')}
                  disabled={matches.length === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMatch('next')}
                  disabled={matches.length === 0}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Replace Section */}
          <div className="border-t pt-4">
            <div className="flex items-center space-x-2 mb-3">
              <Replace className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">搜索和替换</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <Input
                placeholder="要替换的词汇..."
                value={replaceQuery}
                onChange={(e) => {
                  setReplaceQuery(e.target.value)
                  setIsReplaceMode(true)
                }}
                onFocus={() => setIsReplaceMode(true)}
              />
              <Input
                placeholder="替换为..."
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={replaceAll}
                disabled={!replaceQuery.trim() || !replaceText.trim()}
                size="sm"
              >
                全部替换
              </Button>
              <Button
                variant="outline"
                onClick={replaceCurrent}
                disabled={currentMatchIndex < 0 || !replaceText.trim()}
                size="sm"
              >
                替换当前
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  clearHighlights()
                  setIsReplaceMode(false)
                  setCurrentMatchIndex(-1)
                  setMatches([])
                }}
                size="sm"
              >
                清除高亮
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editor */}
      <Card>
        <CardContent className="p-0">
          <div className="border border-editor-border rounded-lg bg-editor-background">
            <EditorContent 
              editor={editor}
              ref={editorRef}
              className="min-h-[400px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-editor-highlight-search rounded"></div>
              <span>搜索匹配</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-editor-highlight-current rounded"></div>
              <span>当前匹配</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-editor-highlight-replace rounded"></div>
              <span>已替换</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ChineseTextEditor