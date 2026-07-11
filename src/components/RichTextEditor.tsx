import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import DOMPurify from 'dompurify'
import { FontSize } from './tiptap/FontSize'
import './RichTextEditor.css'

const FONT_SIZES = [
  { label: 'Normal', value: '' },
  { label: 'Small', value: '0.85em' },
  { label: 'Large', value: '1.25em' },
  { label: 'Huge', value: '1.75em' },
]

const COLORS = ['#1f1f1f', '#7c2d12', '#b91c1c', '#1d4ed8', '#15803d', '#a16207']

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  editable?: boolean
}

export function RichTextEditor({ value, onChange, editable = true }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Underline, TextStyle, Color, FontSize, Link.configure({ openOnClick: false })],
    content: value,
    editable,
    onUpdate: ({ editor }) => {
      onChange(DOMPurify.sanitize(editor.getHTML()))
    },
  })

  if (!editor) return null

  if (!editable) {
    return <div className="rich-text-view" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value) }} />
  }

  return (
    <div className="rich-text-editor">
      <div className="rich-text-toolbar">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'active' : ''}
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'active' : ''}
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'active' : ''}
          title="Underline"
        >
          U
        </button>
        <select
          title="Font size"
          value={FONT_SIZES.find((s) => editor.isActive('textStyle', { fontSize: s.value }))?.value ?? ''}
          onChange={(e) => {
            const size = e.target.value
            if (size) editor.chain().focus().setFontSize(size).run()
            else editor.chain().focus().unsetFontSize().run()
          }}
        >
          {FONT_SIZES.map((size) => (
            <option key={size.label} value={size.value}>
              {size.label}
            </option>
          ))}
        </select>
        <div className="color-swatches">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              style={{ backgroundColor: color }}
              title={color}
              onClick={() => editor.chain().focus().setColor(color).run()}
            />
          ))}
          <button type="button" className="clear-color" title="Clear color" onClick={() => editor.chain().focus().unsetColor().run()}>
            ×
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            const url = window.prompt('Link URL')
            if (url) editor.chain().focus().setLink({ href: url }).run()
          }}
          className={editor.isActive('link') ? 'active' : ''}
          title="Link"
        >
          Link
        </button>
        <button type="button" onClick={() => editor.chain().focus().unsetLink().run()} title="Remove link">
          Unlink
        </button>
      </div>
      <EditorContent editor={editor} className="rich-text-content" />
    </div>
  )
}
