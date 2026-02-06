// components/SelfHostedTinyMCE.tsx - PRODUCTION-READY WITH SECURITY
'use client';

import { extractFileName, deleteEditorImage, uploadEditorImage } from '@/lib/services/editorService';
import React, { useEffect, useRef, useState } from 'react';

interface SelfHostedTinyMCEProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  height?: number;
  className?: string;
  minLength?: number;
  maxLength?: number;
  showCharCount?: boolean;
}

declare global {
  interface Window {
    tinymce: any;
  }
}

// ✅ NATIVE XSS PROTECTION - NO EXTERNAL LIBRARY
const sanitizeHTML = (html: string): string => {
  if (!html) return '';
  
  // Create a temporary DOM element
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Allowed tags
  const allowedTags = new Set([
    'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'STRIKE',
    'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'UL', 'OL', 'LI',
    'A', 'IMG',
    'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD',
    'BLOCKQUOTE', 'CODE', 'PRE',
    'SPAN', 'DIV', 'HR'
  ]);
  
  // Allowed attributes per tag
  const allowedAttributes: Record<string, Set<string>> = {
    'A': new Set(['href', 'title', 'target', 'rel']),
    'IMG': new Set(['src', 'alt', 'title', 'width', 'height']),
    'TD': new Set(['colspan', 'rowspan']),
    'TH': new Set(['colspan', 'rowspan']),
    'SPAN': new Set(['style']),
    'DIV': new Set(['style']),
    'P': new Set(['style'])
  };
  
  // Allowed CSS properties (for style attribute)
  const allowedStyles = new Set([
    'color', 'background-color', 'font-size', 'font-weight',
    'text-align', 'text-decoration', 'font-style'
  ]);
  
  // Recursive sanitization
  const sanitizeNode = (node: Node): Node | null => {
    // Text nodes are safe
    if (node.nodeType === Node.TEXT_NODE) {
      return node.cloneNode(false);
    }
    
    // Only allow element nodes
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }
    
    const element = node as Element;
    const tagName = element.tagName.toUpperCase();
    
    // Block dangerous tags
    if (!allowedTags.has(tagName)) {
      return null;
    }
    
    // Create clean element
    const cleanElement = document.createElement(tagName);
    
    // Copy allowed attributes
    const allowedAttrs = allowedAttributes[tagName] || new Set();
    
    Array.from(element.attributes).forEach(attr => {
      const attrName = attr.name.toLowerCase();
      const attrValue = attr.value;
      
      if (allowedAttrs.has(attrName)) {
        // Special handling for dangerous attributes
        if (attrName === 'href' || attrName === 'src') {
          // Block javascript:, data:, vbscript: URLs
          const value = attrValue.trim().toLowerCase();
          if (value.startsWith('javascript:') || 
              value.startsWith('data:') || 
              value.startsWith('vbscript:') ||
              value.startsWith('file:')) {
            return; // Skip this attribute
          }
        }
        
        // Special handling for style attribute
        if (attrName === 'style') {
          const sanitizedStyle = sanitizeStyle(attrValue);
          if (sanitizedStyle) {
            cleanElement.setAttribute(attrName, sanitizedStyle);
          }
          return;
        }
        
        cleanElement.setAttribute(attrName, attrValue);
      }
    });
    
    // Force safe attributes for links
    if (tagName === 'A') {
      cleanElement.setAttribute('rel', 'noopener noreferrer');
      if (cleanElement.getAttribute('target') === '_blank') {
        cleanElement.setAttribute('target', '_blank');
      }
    }
    
    // Recursively sanitize children
    Array.from(element.childNodes).forEach(child => {
      const sanitizedChild = sanitizeNode(child);
      if (sanitizedChild) {
        cleanElement.appendChild(sanitizedChild);
      }
    });
    
    return cleanElement;
  };
  
  // Sanitize CSS
  const sanitizeStyle = (style: string): string => {
    const styles: string[] = [];
    const declarations = style.split(';');
    
    declarations.forEach(decl => {
      const [property, value] = decl.split(':').map(s => s.trim());
      if (property && value && allowedStyles.has(property.toLowerCase())) {
        // Block expressions and URLs in CSS
        if (!value.toLowerCase().includes('expression') && 
            !value.toLowerCase().includes('javascript:') &&
            !value.toLowerCase().includes('import')) {
          styles.push(`${property}: ${value}`);
        }
      }
    });
    
    return styles.join('; ');
  };
  
  // Sanitize all nodes
  const fragment = document.createDocumentFragment();
  Array.from(temp.childNodes).forEach(child => {
    const sanitized = sanitizeNode(child);
    if (sanitized) {
      fragment.appendChild(sanitized);
    }
  });
  
  // Convert back to HTML
  const container = document.createElement('div');
  container.appendChild(fragment);
  
  return container.innerHTML;
};

export const SelfHostedTinyMCE: React.FC<SelfHostedTinyMCEProps> = ({
  value,
  onChange,
  placeholder = "Start typing...",
  height = 400,
  className = "",
  minLength = 0,
  maxLength = Infinity,
  showCharCount = true
}) => {
  const editorRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const isUpdatingRef = useRef(false);
  const lastNotificationTimeRef = useRef<number>(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [editorId] = useState(() => `tinymce-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const getPlainTextLength = (html: string): number => {
    if (!html) return 0;
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const text = tmp.textContent || tmp.innerText || '';
    return text.length;
  };

  const truncateHTML = (html: string, maxChars: number): string => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    
    let charCount = 0;
    
    const processNode = (node: Node): boolean => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        if (charCount + text.length > maxChars) {
          const remaining = maxChars - charCount;
          node.textContent = text.substring(0, remaining);
          charCount = maxChars;
          return false;
        }
        charCount += text.length;
        return true;
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const children = Array.from(node.childNodes);
        for (let i = 0; i < children.length; i++) {
          if (!processNode(children[i])) {
            for (let j = i + 1; j < children.length; j++) {
              node.removeChild(children[j]);
            }
            return false;
          }
        }
      }
      
      return true;
    };
    
    processNode(tmp);
    
    const removeEmptyTags = (element: Element) => {
      const children = Array.from(element.children);
      children.forEach(child => {
        removeEmptyTags(child);
        
        const hasText = (child.textContent || '').trim().length > 0;
        const hasImage = child.tagName === 'IMG' || child.querySelector('img');
        
        if (!hasText && !hasImage) {
          child.remove();
        }
      });
    };
    
    removeEmptyTags(tmp);
    
    return tmp.innerHTML;
  };

  const showNotification = (editor: any, text: string, type: 'info' | 'warning' | 'error' | 'success', timeout: number = 3000) => {
    const now = Date.now();
    
    if (now - lastNotificationTimeRef.current < 1000) {
      return;
    }
    
    lastNotificationTimeRef.current = now;
    
    if (editor && editor.notificationManager) {
      editor.notificationManager.open({ text, type, timeout });
    }
  };

  const deleteImageFromServer = async (imageUrl: string): Promise<boolean> => {
    try {
      const fileName = extractFileName(imageUrl);
      
      if (!fileName) {
        console.error('Could not extract filename from URL:', imageUrl);
        return false;
      }

      await deleteEditorImage(fileName);
      return true;
    } catch (error: any) {
      console.error('❌ Error deleting image:', error);
      return false;
    }
  };

  useEffect(() => {
    if (!isMounted) return;

    const loadTinyMCE = () => {
      if (window.tinymce && editorRef.current) {
        window.tinymce.remove(`#${editorId}`);
      }

      if (window.tinymce) {
        initializeEditor();
        return;
      }

      const script = document.createElement('script');
      script.src = '/tinymce/tinymce.min.js';
      script.onload = () => {
        setIsLoaded(true);
        setTimeout(() => {
          initializeEditor();
        }, 100);
      };
      script.onerror = () => {
        console.error('❌ Failed to load TinyMCE');
      };
      document.head.appendChild(script);
    };

    const initializeEditor = () => {
      if (!window.tinymce) return;

      window.tinymce.init({
        selector: `#${editorId}`,
        height: height,
        
        license_key: 'gpl',
        
        base_url: '/tinymce',
        suffix: '.min',
        
        plugins: [
          'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
          'searchreplace', 'visualblocks', 'code', 'fullscreen',
          'insertdatetime', 'media', 'table', 'wordcount', 'help'
        ],
        
        menubar: 'edit view insert format tools',
        
        toolbar: 'undo redo | formatselect | bold italic underline | alignleft aligncenter alignright | bullist numlist | link image deleteimage | removeformat code',
        
        skin: 'oxide-dark',
        content_css: 'dark',
        
        content_style: `
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px; 
            line-height: 1.6;
            color: #f1f5f9 !important;
            background-color: #0f172a !important;
            margin: 0;
            padding: 12px 14px !important;
            min-height: ${height - 100}px;
            box-sizing: border-box;
          }
          
          body:empty::before {
            content: "${placeholder}";
            color: #ffffff;
            opacity: 0.6;
          }
          
          * {
            color: #f1f5f9 !important;
          }
          
          p {
            margin: 0 0 0.8em 0;
            line-height: 1.6;
            color: #e2e8f0 !important;
            min-height: 1.4em;
          }
          
          p:first-child {
            margin-top: 0;
          }
          
          p:last-child {
            margin-bottom: 0;
          }
          
          h1, h2, h3, h4, h5, h6 { 
            color: #f8fafc !important; 
            margin: 1em 0 0.5em 0;
            font-weight: 600;
            line-height: 1.4;
          }
          
          strong, b {
            color: #f8fafc !important;
            font-weight: 600;
          }
          
          em, i {
            color: #e2e8f0 !important;
            font-style: italic;
          }
          
          u {
            color: #e2e8f0 !important;
            text-decoration: underline;
          }
          
          a { 
            color: #a855f7 !important; 
            text-decoration: underline;
          }
          
          a:hover {
            color: #c084fc !important;
          }
          
          ul, ol {
            color: #e2e8f0 !important;
            padding-left: 1.5em;
            margin: 0.6em 0;
          }
          
          li {
            color: #e2e8f0 !important;
            margin: 0.3em 0;
            line-height: 1.6;
          }
          
          table { 
            border-collapse: collapse; 
            width: 100%; 
            margin: 0.8em 0;
            background-color: #1e293b !important;
            border: 1px solid #475569;
          }
          
          th, td { 
            border: 1px solid #475569; 
            padding: 6px 10px;
            text-align: left; 
            color: #e2e8f0 !important;
          }
          
          th { 
            background-color: #334155 !important; 
            font-weight: 600;
            color: #f1f5f9 !important;
          }
          
          code { 
            background-color: #374151 !important; 
            color: #fbbf24 !important; 
            padding: 2px 5px;
            border-radius: 4px;
            font-family: 'SF Mono', Monaco, Consolas, monospace;
          }
          
          pre {
            background-color: #111827 !important;
            color: #f3f4f6 !important;
            padding: 12px;
            border-radius: 8px;
            overflow-x: auto;
            border: 1px solid #374151;
          }
          
          blockquote {
            border-left: 4px solid #8b5cf6;
            margin: 0.8em 0;
            padding: 0.4em 0.8em;
            color: #cbd5e1 !important;
            background-color: #334155 !important;
            border-radius: 0 8px 8px 0;
          }
          
          hr {
            border: none;
            border-top: 2px solid #475569;
            margin: 1.2em 0;
          }
          
          img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            cursor: pointer;
          }
          
          img:hover {
            opacity: 0.8;
            box-shadow: 0 0 0 2px #a855f7;
          }
          
          img[data-mce-selected] {
            box-shadow: 0 0 0 3px #a855f7 !important;
          }
        `,
        
        branding: false,
        promotion: false,
        resize: true,
        
        toolbar_mode: 'sliding',
        statusbar: true,
        elementpath: false,
        
        images_upload_handler: async (blobInfo: any, progress: any) => {
          return new Promise(async (resolve, reject) => {
            try {
              const file = blobInfo.blob();
              const result = await uploadEditorImage(file);
              const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://testapi.knowledgemarkg.com';
              resolve(`${apiUrl}${result.location}`);
            } catch (error: any) {
              console.error('Upload error:', error);
              reject(error.message || '❌ Upload failed');
            }
          });
        },
        
        // ✅ DIRECT FILE PICKER - NO MODAL
        file_picker_types: 'image',
        file_picker_callback: (callback: any, value: any, meta: any) => {
          if (meta.filetype === 'image') {
            const input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('accept', 'image/webp,image/png,image/jpg,image/jpeg');
            input.style.display = 'none';
            
            document.body.appendChild(input);
            
            input.onchange = async function() {
              const file = (this as HTMLInputElement).files?.[0];
              document.body.removeChild(input);
              
              if (!file) return;
              
              try {
                if (editorRef.current) {
                  showNotification(editorRef.current, '⏳ Uploading image...', 'info', 3000);
                }
                
                const result = await uploadEditorImage(file);
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://testapi.knowledgemarkg.com';
                const imageUrl = `${apiUrl}${result.location}`;
                
                callback(imageUrl, {
                  alt: file.name,
                  title: file.name
                });
                
                if (editorRef.current) {
                  showNotification(editorRef.current, '✅ Image uploaded successfully', 'success', 3000);
                }
                
              } catch (error: any) {
                console.error('Upload error:', error);
                
                if (error.message && error.message.includes('❌')) {
                  alert(error.message);
                } else {
                  alert('❌ Image upload failed!\n\nPlease try again.');
                }
                
                if (editorRef.current) {
                  showNotification(editorRef.current, '❌ Image upload failed', 'error', 5000);
                }
              }
            };
            
            input.click();
          }
        },
        
        setup: (editor: any) => {
          editorRef.current = editor;
          
          // ✅ BLOCK TYPING when limit reached
          editor.on('keydown', (e: any) => {
            const allowedKeys = [8, 46, 37, 38, 39, 40, 35, 36, 33, 34];
            
            if (allowedKeys.includes(e.keyCode) || e.ctrlKey || e.metaKey) {
              return;
            }
            
            const content = editor.getContent();
            const textLength = getPlainTextLength(content);
            
            if (maxLength !== Infinity && textLength >= maxLength) {
              e.preventDefault();
              e.stopPropagation();
              
              showNotification(
                editor,
                `⚠️ Character limit reached! You cannot add more text. (${maxLength} characters maximum)`,
                'error',
                3000
              );
            }
          });
          
          // ✅ PASTE HANDLER WITH SECURITY
// Replace ONLY the PastePreProcess event in your existing code:

editor.on('PastePreProcess', (e: any) => {
  if (maxLength === Infinity) {
    e.content = sanitizeHTML(e.content);
    return;
  }
  
  const pastedHTML = e.content;
  const pastedLength = getPlainTextLength(pastedHTML);
  
  const currentContent = editor.getContent();
  const currentLength = getPlainTextLength(currentContent);
  
  // ✅ SMART REPLACE: Limit reached but paste is smaller
  if (currentLength >= maxLength && pastedLength <= maxLength) {
    const truncatedHTML = pastedLength > maxLength 
      ? truncateHTML(pastedHTML, maxLength) 
      : pastedHTML;
    
    const sanitized = sanitizeHTML(truncatedHTML);
    
    e.content = sanitized;
    
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.setContent(sanitized);
        
        showNotification(
          editorRef.current,
          `✅ Content replaced! Old: ${currentLength} chars → New: ${getPlainTextLength(sanitized)} chars`,
          'success',
          4000
        );
      }
    }, 0);
    
    return;
  }
  
  // ✅ LARGE REPLACE: Limit reached and paste is also large
  if (currentLength >= maxLength && pastedLength > maxLength) {
    const shouldReplace = confirm(
      `⚠️ LIMIT REACHED!\n\n` +
      `Current: ${currentLength} characters (limit: ${maxLength})\n` +
      `Pasting: ${pastedLength} characters\n\n` +
      `Do you want to REPLACE all content with new content?\n` +
      `(New content will be truncated to ${maxLength} characters)`
    );
    
    if (shouldReplace) {
      const truncatedHTML = truncateHTML(pastedHTML, maxLength);
      const sanitized = sanitizeHTML(truncatedHTML);
      
      e.content = sanitized;
      
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.setContent(sanitized);
          
          showNotification(
            editorRef.current,
            `✅ Content replaced and truncated! ${pastedLength} → ${maxLength} chars`,
            'success',
            4000
          );
        }
      }, 0);
    } else {
      e.preventDefault();
      e.content = '';
      
      showNotification(
        editor,
        `❌ Paste cancelled. Content unchanged.`,
        'info',
        3000
      );
    }
    
    return;
  }
  
  // ✅ NORMAL PASTE: Within limits
  const totalLength = currentLength + pastedLength;
  
  if (totalLength > maxLength) {
    const allowedLength = maxLength - currentLength;
    
    if (allowedLength <= 0) {
      e.preventDefault();
      e.content = '';
      
      showNotification(
        editor,
        `❌ Cannot paste! Character limit (${maxLength}) already reached.`,
        'error',
        4000
      );
      return;
    }
    
    const truncatedHTML = truncateHTML(pastedHTML, allowedLength);
    e.content = sanitizeHTML(truncatedHTML);
    
    showNotification(
      editor,
      `⚠️ Pasted content truncated! Only ${allowedLength} of ${pastedLength} characters pasted.`,
      'warning',
      4000
    );
  } else {
    e.content = sanitizeHTML(e.content);
  }
});

          
          // ✅ FINAL SAFETY CHECK with sanitization
          editor.on('input change', () => {
            const content = editor.getContent();
            const textLength = getPlainTextLength(content);
            
            if (maxLength !== Infinity && textLength > maxLength) {
              const truncatedContent = truncateHTML(content, maxLength);
              const sanitizedContent = sanitizeHTML(truncatedContent);
              
              isUpdatingRef.current = true;
              editor.setContent(sanitizedContent);
              
              setTimeout(() => {
                isUpdatingRef.current = false;
              }, 50);
              
              setCharCount(maxLength);
              onChangeRef.current(sanitizedContent);
              
              showNotification(
                editor,
                `⚠️ Content exceeded limit and was automatically truncated to ${maxLength} characters`,
                'warning',
                3000
              );
            } else {
              // ✅ SANITIZE on every change
              const sanitizedContent = sanitizeHTML(content);
              
              setCharCount(textLength);
              
              if (!isUpdatingRef.current) {
                isUpdatingRef.current = true;
                onChangeRef.current(sanitizedContent);
                setTimeout(() => {
                  isUpdatingRef.current = false;
                }, 50);
              }
            }
          });
          
          // ✅ ALT+0 - SHOW STATISTICS
          editor.on('keydown', (e: any) => {
            if (e.altKey && e.keyCode === 48) {
              e.preventDefault();
              
              const content = editor.getContent();
              const plainText = editor.getContent({ format: 'text' });
              const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length;
              const paragraphs = content.split(/<\/p>/gi).length - 1;
              const images = (content.match(/<img/gi) || []).length;
              const links = (content.match(/<a /gi) || []).length;
              
              const stats = `
📊 EDITOR STATISTICS
━━━━━━━━━━━━━━━━━━━━
📝 Characters: ${charCount}${maxLength !== Infinity ? ` / ${maxLength}` : ''}
${maxLength !== Infinity ? `✅ Remaining: ${maxLength - charCount}\n` : ''}📄 Words: ${wordCount}
¶  Paragraphs: ${paragraphs}
🖼️ Images: ${images}
🔗 Links: ${links}
🔒 XSS Protection: ACTIVE
━━━━━━━━━━━━━━━━━━━━
💡 Press Alt+0 to view stats
              `.trim();
              
              editor.windowManager.open({
                title: '📊 Editor Statistics',
                body: {
                  type: 'panel',
                  items: [
                    {
                      type: 'htmlpanel',
                      html: `<pre style="
                        font-family: 'SF Mono', Monaco, Consolas, monospace;
                        font-size: 13px;
                        line-height: 1.6;
                        color: #e2e8f0;
                        background: #1e293b;
                        padding: 16px;
                        border-radius: 8px;
                        border: 1px solid #475569;
                        white-space: pre-wrap;
                      ">${stats}</pre>`
                    }
                  ]
                },
                buttons: [
                  {
                    type: 'cancel',
                    text: 'Close'
                  }
                ],
                initialData: {}
              });
              
              return false;
            }
          });
          
          // ✅ DELETE IMAGE BUTTON
          editor.ui.registry.addButton('deleteimage', {
            text: '🗑️',
            tooltip: 'Delete Selected Image',
            onAction: async () => {
              const selectedImg = editor.selection.getNode();
              if (selectedImg && selectedImg.nodeName === 'IMG') {
                const imageUrl = selectedImg.src;
                const imageName = imageUrl.split('/').pop() || 'this image';
                
                const confirmed = confirm(`⚠️ Delete "${imageName}"?`);
                
                if (confirmed) {
                  try {
                    const deleted = await deleteImageFromServer(imageUrl);
                    if (deleted) {
                      editor.dom.remove(selectedImg);
                      editor.nodeChanged();
                      
                      isUpdatingRef.current = true;
                      const content = editor.getContent();
                      const sanitized = sanitizeHTML(content);
                      onChangeRef.current(sanitized);
                      setTimeout(() => isUpdatingRef.current = false, 100);
                      
                      showNotification(editor, '✅ Image deleted successfully', 'success', 2000);
                    }
                  } catch (error) {
                    console.error('Delete image error:', error);
                    showNotification(editor, '❌ Error deleting image', 'error', 3000);
                  }
                }
              } else {
                showNotification(editor, '📝 Please select an image first', 'warning', 2000);
              }
            }
          });

          // ✅ DELETE IMAGE with Backspace/Delete
          editor.on('keydown', async (e: any) => {
            if (e.keyCode === 8 || e.keyCode === 46) {
              const selectedNode = editor.selection.getNode();
              
              if (selectedNode && selectedNode.nodeName === 'IMG') {
                e.preventDefault();
                
                const imageUrl = selectedNode.src;
                const imageName = imageUrl.split('/').pop() || 'this image';
                
                const confirmed = confirm(`⚠️ Delete "${imageName}"?`);
                
                if (confirmed) {
                  try {
                    const deleted = await deleteImageFromServer(imageUrl);
                    if (deleted) {
                      editor.dom.remove(selectedNode);
                      editor.nodeChanged();
                      
                      isUpdatingRef.current = true;
                      const content = editor.getContent();
                      const sanitized = sanitizeHTML(content);
                      onChangeRef.current(sanitized);
                      setTimeout(() => isUpdatingRef.current = false, 100);
                      
                      showNotification(editor, '✅ Image deleted successfully', 'success', 2000);
                    }
                  } catch (error) {
                    console.error('Delete image error:', error);
                  }
                }
              }
            }
          });
          
          // ✅ INIT EVENT
          editor.on('init', () => {
            setIsReady(true);
            
            if (value) {
              const initialLength = getPlainTextLength(value);
              
              if (maxLength !== Infinity && initialLength > maxLength) {
                const truncatedValue = truncateHTML(value, maxLength);
                const sanitizedValue = sanitizeHTML(truncatedValue);
                editor.setContent(sanitizedValue);
                setCharCount(getPlainTextLength(sanitizedValue));
                
                onChangeRef.current(sanitizedValue);
                
                setTimeout(() => {
                  showNotification(
                    editor,
                    `⚠️ Content was ${initialLength} characters. Truncated to ${maxLength} character limit.`,
                    'warning',
                    5000
                  );
                }, 500);
              } else {
                const sanitizedValue = sanitizeHTML(value);
                editor.setContent(sanitizedValue);
                setCharCount(initialLength);
              }
            }
            
            // ✅ Styling
            const container = editor.getContainer();
            if (container) {
              container.style.backgroundColor = '#1e293b';
              container.style.border = '1px solid #475569';
              container.style.borderRadius = '12px';
              container.style.overflow = 'hidden';
              
              const header = container.querySelector('.tox-editor-header') as HTMLElement;
              if (header) {
                header.style.display = 'flex';
                header.style.flexDirection = 'row';
                header.style.flexWrap = 'wrap';
                header.style.alignItems = 'center';
                header.style.gap = '4px';
                header.style.padding = '2px 6px';
                header.style.borderBottom = '1px solid #475569';
                header.style.minHeight = 'auto';
              }
              
              const menubar = container.querySelector('.tox-menubar') as HTMLElement;
              if (menubar) {
                menubar.style.flex = '0 0 auto';
                menubar.style.padding = '2px 4px';
                menubar.style.minHeight = 'auto';
                menubar.style.borderBottom = 'none';
              }
              
              const toolbar = container.querySelector('.tox-toolbar__primary') as HTMLElement;
              if (toolbar) {
                toolbar.style.flex = '1 1 auto';
                toolbar.style.padding = '2px 4px';
                toolbar.style.gap = '2px';
                toolbar.style.borderTop = 'none';
                toolbar.style.minHeight = 'auto';
              }
              
              const statusbar = container.querySelector('.tox-statusbar') as HTMLElement;
              if (statusbar) {
                statusbar.style.padding = '3px 8px';
              }
              
              const mediaQuery = window.matchMedia('(max-width: 768px)');
              
              const handleMobileView = (e: MediaQueryListEvent | MediaQueryList) => {
                const header = container.querySelector('.tox-editor-header') as HTMLElement;
                if (header) {
                  if (e.matches) {
                    header.style.flexDirection = 'column';
                    header.style.alignItems = 'stretch';
                    
                    const menubar = container.querySelector('.tox-menubar') as HTMLElement;
                    if (menubar) {
                      menubar.style.borderBottom = '1px solid #475569';
                    }
                  } else {
                    header.style.flexDirection = 'row';
                    header.style.alignItems = 'center';
                    
                    const menubar = container.querySelector('.tox-menubar') as HTMLElement;
                    if (menubar) {
                      menubar.style.borderBottom = 'none';
                    }
                  }
                }
              };
              
              handleMobileView(mediaQuery);
              mediaQuery.addEventListener('change', handleMobileView);
            }
          });
        }
      });
    };

    loadTinyMCE();

    return () => {
      if (window.tinymce && editorRef.current) {
        window.tinymce.remove(`#${editorId}`);
      }
    };
  }, [isMounted, editorId, placeholder, height, minLength, maxLength]);

  // ✅ Handle external value changes with sanitization
  useEffect(() => {
    if (editorRef.current && isReady && !isUpdatingRef.current) {
      const currentContent = editorRef.current.getContent();
      
      if (value !== currentContent) {
        const incomingLength = getPlainTextLength(value || '');
        
        if (maxLength !== Infinity && incomingLength > maxLength) {
          const truncatedValue = truncateHTML(value || '', maxLength);
          const sanitizedValue = sanitizeHTML(truncatedValue);
          editorRef.current.setContent(sanitizedValue);
          setCharCount(getPlainTextLength(sanitizedValue));
          onChangeRef.current(sanitizedValue);
        } else {
          const sanitizedValue = sanitizeHTML(value || '');
          editorRef.current.setContent(sanitizedValue);
          setCharCount(incomingLength);
        }
      }
    }
  }, [value, isReady, maxLength]);

  if (!isMounted) {
    return (
      <div className={`border border-slate-700 rounded-xl bg-slate-800/50 p-4 ${className}`} style={{ height: height + 50 }}>
        <div className="flex items-center justify-center h-full">
          <div className="flex items-center gap-2 text-violet-400">
            <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Initializing editor...</span>
          </div>
        </div>
      </div>
    );
  }

  const getCharCountColor = () => {
    if (minLength > 0 && charCount < minLength) {
      return 'text-red-400';
    }
    if (maxLength !== Infinity) {
      const percentage = (charCount / maxLength) * 100;
      if (percentage >= 95) return 'text-red-500';
      if (percentage >= 90) return 'text-red-400';
      if (percentage >= 75) return 'text-orange-400';
    }
    return 'text-slate-400';
  };

  return (
    <div className={className}>
      {!isReady && (
        <div 
          className="border border-slate-700 rounded-xl bg-slate-800/50 p-4 flex items-center justify-center" 
          style={{ height: height }}
        >
          <div className="flex items-center gap-2 text-violet-400">
            <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading editor...</span>
          </div>
        </div>
      )}
      
      <div
        className="rounded-xl overflow-hidden border border-slate-700"
        style={{
          visibility: isReady ? 'visible' : 'hidden',
          opacity: isReady ? 1 : 0,
          transition: 'opacity 0.3s ease',
          backgroundColor: '#1e293b'
        }}
      >
        <textarea 
          id={editorId} 
          className="w-full"
          suppressHydrationWarning
        />
      </div>
      
      {showCharCount && isReady && (
        <div className="flex items-center justify-between mt-2 px-1">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${getCharCountColor()}`}>
              {charCount} {maxLength !== Infinity && `/ ${maxLength}`} characters
            </span>
            
            {minLength > 0 && charCount < minLength && (
              <span className="text-xs text-red-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Min {minLength} chars required
              </span>
            )}
            
            {maxLength !== Infinity && charCount >= maxLength && (
              <span className="text-xs text-red-500 flex items-center gap-1 font-semibold">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Limit reached
              </span>
            )}
            
            <span className="text-xs text-green-500 flex items-center gap-1">
              🔒 XSS Protected
            </span>
            
            <span className="text-xs text-slate-500">• Alt+0 for stats</span>
          </div>
          
          {maxLength !== Infinity && (
            <div className="flex items-center gap-2">
              <div className="w-28 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    charCount >= maxLength 
                      ? 'bg-red-500' 
                      : charCount >= maxLength * 0.95 
                        ? 'bg-red-400'
                        : charCount >= maxLength * 0.9 
                          ? 'bg-orange-500'
                          : charCount >= maxLength * 0.75
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min((charCount / maxLength) * 100, 100)}%` }}
                />
              </div>
              <span className={`text-xs font-medium ${charCount >= maxLength ? 'text-red-500' : 'text-slate-500'}`}>
                {Math.max(0, maxLength - charCount)} left
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ProductDescriptionEditor = ({ 
  label, 
  value, 
  onChange, 
  placeholder = "Start typing your description...",
  required = false,
  height = 350,
  showHelpText,
  className = "",
  minLength = 0,
  maxLength = Infinity,
  showCharCount = true
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  height?: number;
  showHelpText?: string;
  className?: string;
  minLength?: number;
  maxLength?: number;
  showCharCount?: boolean;
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-2">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <SelfHostedTinyMCE
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        height={height}
        className="w-full"
        minLength={minLength}
        maxLength={maxLength}
        showCharCount={showCharCount}
      />
      {showHelpText && (
        <p className="text-xs text-slate-400 mt-1">
          {showHelpText}
        </p>
      )}
    </div>
  );
};
