/**
 * This extension is a transformation from draft-js-markdown-shortcuts-plugin (github repo: https://github.com/ngs/draft-js-markdown-shortcuts-plugin)
 * Thanks very much for the contributors of draft-js-markdown-shortcuts-plugin!!!
 */

import MarkdownParser from 'marked'
import { ContentUtils } from 'braft-utils'
import handleBlockType from './modifiers/handleBlockType'
import handleInlineStyle from './modifiers/handleInlineStyle'
import handleNewCodeBlock from './modifiers/handleNewCodeBlock'
import insertEmptyBlock from './modifiers/insertEmptyBlock'
import handleLink from './modifiers/handleLink'
import handleImage from './modifiers/handleImage'
import leaveList from './modifiers/leaveList'
import insertText from './modifiers/insertText'
import changeCurrentBlockType from './modifiers/changeCurrentBlockType'
// import { replaceText } from './utils'

function checkCharacterForState(editorState, character) {
  let newEditorState = handleBlockType(editorState, character)
  const contentState = editorState.getCurrentContent()
  const selection = editorState.getSelection()
  const key = selection.getStartKey()
  const currentBlock = contentState.getBlockForKey(key)
  const type = currentBlock.getType()
  if (editorState === newEditorState) {
    newEditorState = handleImage(editorState, character)
  }
  if (editorState === newEditorState) {
    newEditorState = handleLink(editorState, character)
  }
  if (editorState === newEditorState && type !== 'code-block') {
    newEditorState = handleInlineStyle(editorState, character)
  }
  return newEditorState
}

function checkReturnForState(editorState, ev, insertEmptyBlockOnReturnWithModifierKey) {
  let newEditorState = editorState
  const contentState = editorState.getCurrentContent()
  const selection = editorState.getSelection()
  const key = selection.getStartKey()
  const currentBlock = contentState.getBlockForKey(key)
  const type = currentBlock.getType()
  const text = currentBlock.getText()
  if (/-list-item$/.test(type) && text === '') {
    newEditorState = leaveList(editorState)
  }
  if (newEditorState === editorState
      && insertEmptyBlockOnReturnWithModifierKey
      && (ev.ctrlKey || ev.shiftKey || ev.metaKey || ev.altKey
          || (/^header-/.test(type) && selection.isCollapsed() && selection.getEndOffset() === text.length))) {
    newEditorState = insertEmptyBlock(editorState)
  }
  if (newEditorState === editorState && type !== 'code-block' && /^```([\w-]+)?$/.test(text)) {
    newEditorState = handleNewCodeBlock(editorState)
  }
  if (newEditorState === editorState && type === 'code-block') {
    if (/```\s*$/.test(text)) {
      newEditorState = changeCurrentBlockType(newEditorState, type, text.replace(/\n```\s*$/, ''))
      newEditorState = insertEmptyBlock(newEditorState)
    } else {
      newEditorState = insertText(editorState, '\n')
    }
  }
  if (editorState === newEditorState) {
    newEditorState = handleInlineStyle(editorState, '\n')
  }
  return newEditorState
}

export default (options) => {

  options = {
    insertEmptyBlockOnReturnWithModifierKey: true,
    ...options
  }

  const { includeEditors, excludeEditors, insertEmptyBlockOnReturnWithModifierKey } = options

  return [
    {
      type: 'prop-interception',
      includeEditors, excludeEditors,
      interceptor: (editorProps) => {
        editorProps = {
          ...editorProps,
          ...{
            handleReturn(ev, editorState, editor) {
              const newEditorState = checkReturnForState(editorState, ev, insertEmptyBlockOnReturnWithModifierKey)
              if (editorState !== newEditorState) {
                editor.setValue(newEditorState)
                return 'handled'
              }
              return 'not-handled'
            },
            handleBeforeInput(character, editorState, editor) {
              if (character.match(/[A-z0-9_*~`]/)) {
                return 'not-handled'
              }
              const newEditorState = checkCharacterForState(editorState, character)
              if (editorState !== newEditorState) {
                editor.setValue(newEditorState)
                return 'handled'
              }
              return 'not-handled'
            },
            handlePastedText(text, html, editorState, editor) {
              const blocks = ContentUtils.getSelectedBlocks(editorState)
              if (blocks && blocks[0] && blocks[0].type === 'code-block') {
                return 'not-handled'
              }
              const newHtml = MarkdownParser(text)
              editor.setValue(ContentUtils.insertHTML(editorState, newHtml, 'paste'))
              return 'handled'
            }
          }
        }
        return editorProps
      }
    },
  ]

}