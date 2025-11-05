// components/SelfHostedTinyMCE.tsx - KEYBOARD DELETE ONLY
'use client';

import React, { useEffect, useRef, useState } from 'react';

interface SelfHostedTinyMCEProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  height?: number;
  className?: string;
}

declare global {
  interface Window {
    tinymce: any;
  }
}

export const SelfHostedTinyMCE: React.FC<SelfHostedTinyMCEProps> = ({
  value,
  onChange,
  placeholder = "Start typing...",
  height = 400,
  className = ""
}) => {
  const editorRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [editorId] = useState(() => `tinymce-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 🗑️ Image deletion function
  const deleteImageFromServer = async (imageUrl: string): Promise<boolean> => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://testapi.knowledgemarkg.com';
      
      // Extract filename from URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      if (!fileName) {
        console.error('Could not extract filename from URL:', imageUrl);
        return false;
      }

      const response = await fetch(`${apiUrl}/api/Editor/delete-image?fileName=${fileName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('Failed to delete image:', response.statusText);
        return false;
      }

      console.log('✅ Image deleted successfully:', fileName);
      return true;
    } catch (error) {
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
        
        // 🔑 License
        license_key: 'gpl',
        
        // 📁 Base configuration
        base_url: '/tinymce',
        suffix: '.min',
        
        // 🧩 Core plugins
        plugins: [
          'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
          'searchreplace', 'visualblocks', 'code', 'fullscreen',
          'insertdatetime', 'media', 'table', 'wordcount', 'help'
        ],
        
        // 🔧 Toolbar with delete button
        toolbar: 'undo redo | formatselect | bold italic underline | ' +
                'alignleft aligncenter alignright | ' +
                'bullist numlist | link image | deleteimage | removeformat | code',
        
        // 🎨 DARK THEME
        skin: 'oxide-dark',
        content_css: 'dark',
        
        // 📋 Menu
        menubar: 'edit view insert format tools',
        
        // ✅ Content styling with WHITE placeholder
        content_style: `
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px; 
            line-height: 1.6;
            color: #f1f5f9 !important;
            background-color: #0f172a !important;
            margin: 0;
            padding: 16px;
            min-height: ${height - 120}px;
            box-sizing: border-box;
            position: relative;
          }
          
          /* ✅ WHITE PLACEHOLDER - Clearly visible */
          body[data-mce-placeholder]:not([data-mce-placeholder=""]):empty::before {
            content: attr(data-mce-placeholder);
            color: #ffffff !important;
            font-style: italic;
            position: absolute;
            top: 16px;
            left: 16px;
            pointer-events: none;
            z-index: 1;
            opacity: 0.8;
            font-size: 14px;
          }
          
          body:empty::before {
            content: "${placeholder}";
            color: #ffffff !important;
            font-style: italic;
            position: absolute;
            top: 16px;
            left: 16px;
            pointer-events: none;
            z-index: 1;
            opacity: 0.8;
            font-size: 14px;
          }
          
          * {
            color: #f1f5f9 !important;
          }
          
          p {
            margin: 0 0 1em 0;
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
          
          p:empty {
            min-height: 1.4em;
          }
          
          h1, h2, h3, h4, h5, h6 { 
            color: #f8fafc !important; 
            margin: 1.2em 0 0.6em 0; 
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
            margin: 0.8em 0;
          }
          
          li {
            color: #e2e8f0 !important;
            margin: 0.4em 0;
            line-height: 1.6;
          }
          
          table { 
            border-collapse: collapse; 
            width: 100%; 
            margin: 1em 0; 
            background-color: #1e293b !important;
            border: 1px solid #475569;
          }
          
          th, td { 
            border: 1px solid #475569; 
            padding: 8px 12px; 
            text-align: left; 
            color: #e2e8f0 !important;
          }
          
          th { 
            background-color: #334155 !important; 
            font-weight: 600;
            color: #f1f5f9 !important;
          }
          
          tr:nth-child(even) td {
            background-color: #334155 !important;
          }
          
          code { 
            background-color: #374151 !important; 
            color: #fbbf24 !important; 
            padding: 2px 6px; 
            border-radius: 4px;
            font-family: 'SF Mono', Monaco, Consolas, monospace;
          }
          
          pre {
            background-color: #111827 !important;
            color: #f3f4f6 !important;
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            border: 1px solid #374151;
          }
          
          blockquote {
            border-left: 4px solid #8b5cf6;
            margin: 1em 0;
            padding: 0.5em 1em;
            color: #cbd5e1 !important;
            background-color: #334155 !important;
            border-radius: 0 8px 8px 0;
          }
          
          hr {
            border: none;
            border-top: 2px solid #475569;
            margin: 1.5em 0;
          }
          
          img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            cursor: pointer;
          }
          
          /* Image selection highlight */
          img:hover {
            opacity: 0.8;
            box-shadow: 0 0 0 2px #a855f7;
          }
          
          /* Selected image highlight */
          img[data-mce-selected] {
            box-shadow: 0 0 0 3px #a855f7 !important;
          }
        `,
        
        // ⚙️ Editor settings
        branding: false,
        promotion: false,
        resize: true,
        
        // 🔧 UI Settings
        toolbar_mode: 'wrap',
        statusbar: true,
        elementpath: false,
        
        // 📸 Direct image upload
        images_upload_handler: async (blobInfo: { blob: () => Blob; filename: () => string | undefined; }, progress: any) => {
          return new Promise(async (resolve, reject) => {
            try {
              const formData = new FormData();
              formData.append('file', blobInfo.blob(), blobInfo.filename());

              const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://testapi.knowledgemarkg.com';

              const response = await fetch(`${apiUrl}/api/Editor/upload-image`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: formData
              });

              if (!response.ok) {
                reject(`❌ Upload failed: ${response.statusText}`);
                return;
              }

              let result;
              try {
                result = await response.json();
              } catch (e) {
                reject('❌ Upload failed: Invalid JSON response');
                return;
              }

              if (result?.location) {
                resolve(`${apiUrl}${result.location}`);
              } else {
                reject('❌ Upload failed: Missing image location');
              }

            } catch (error) {
              console.error('Upload error:', error);
              reject('❌ Upload failed: Network error');
            }
          });
        },
        
        // 🎯 Direct file browser
        file_picker_types: 'image',
        file_picker_callback: (callback: any, value: any, meta: any) => {
          if (meta.filetype === 'image') {
            const input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('accept', 'image/png,image/jpeg,image/gif,image/webp');
            input.style.display = 'none';
            
            document.body.appendChild(input);
            
            input.onchange = async function() {
              const file = (this as HTMLInputElement).files?.[0];
              document.body.removeChild(input);
              
              if (!file) return;
              
              try {
                if (editorRef.current) {
                  editorRef.current.notificationManager.open({
                    text: '⏳ Uploading image...',
                    type: 'info',
                    timeout: 3000
                  });
                }
                
                const formData = new FormData();
                formData.append('file', file, file.name);

                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://testapi.knowledgemarkg.com';

                const response = await fetch(`${apiUrl}/api/Editor/upload-image`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                  },
                  body: formData
                });

                if (!response.ok) {
                  throw new Error(`Upload failed: ${response.statusText}`);
                }

                const result = await response.json();
                
                if (result?.location) {
                  const imageUrl = `${apiUrl}${result.location}`;
                  
                  callback(imageUrl, {
                    alt: file.name,
                    title: file.name
                  });
                  
                  if (editorRef.current) {
                    editorRef.current.notificationManager.open({
                      text: '✅ Image uploaded successfully',
                      type: 'success',
                      timeout: 3000
                    });
                  }
                } else {
                  throw new Error('Missing image location in response');
                }
                
              } catch (error) {
                console.error('Upload error:', error);
                
                if (editorRef.current) {
                  editorRef.current.notificationManager.open({
                    text: '❌ Image upload failed',
                    type: 'error',
                    timeout: 5000
                  });
                }
              }
            };
            
            input.click();
          }
        },
        
        // 🔄 Setup callback
        setup: (editor: any) => {
          editorRef.current = editor;
          
          // 🗑️ Register Delete Image button
          editor.ui.registry.addButton('deleteimage', {
            text: '🗑️',
            tooltip: 'Delete Selected Image',
            onAction: async () => {
              const selectedImg = editor.selection.getNode();
              if (selectedImg && selectedImg.nodeName === 'IMG') {
                const imageUrl = selectedImg.src;
                const imageName = imageUrl.split('/').pop() || 'this image';
                
                const confirmed = confirm(
                  `⚠️ Delete "${imageName}"?\n\n` +
                  `This action cannot be undone and will permanently remove the image from both the editor and server.`
                );
                
                if (confirmed) {
                  try {
                    const deleted = await deleteImageFromServer(imageUrl);
                    if (deleted) {
                      editor.dom.remove(selectedImg);
                      editor.nodeChanged();
                      
                      const content = editor.getContent();
                      onChange(content);
                      
                      editor.notificationManager.open({
                        text: '✅ Image deleted successfully',
                        type: 'success',
                        timeout: 3000
                      });
                    } else {
                      editor.notificationManager.open({
                        text: '❌ Failed to delete image from server',
                        type: 'error',
                        timeout: 5000
                      });
                    }
                  } catch (error) {
                    console.error('Delete image error:', error);
                    editor.notificationManager.open({
                      text: '❌ Error deleting image',
                      type: 'error',
                      timeout: 5000
                    });
                  }
                }
              } else {
                editor.notificationManager.open({
                  text: '📝 Please select an image first',
                  type: 'warning',
                  timeout: 2000
                });
              }
            }
          });

          // ⌨️ KEYBOARD DELETE - Backspace aur Delete keys
          editor.on('keydown', async (e: any) => {
            // Check for Backspace (8) or Delete (46) key
            if (e.keyCode === 8 || e.keyCode === 46) {
              const selectedNode = editor.selection.getNode();
              
              // Check if selected element is an image
              if (selectedNode && selectedNode.nodeName === 'IMG') {
                e.preventDefault(); // Prevent default delete behavior
                
                const imageUrl = selectedNode.src;
                const imageName = imageUrl.split('/').pop() || 'this image';
                
                // ⚠️ Confirmation dialog
                const confirmed = confirm(
                  `⚠️ Delete "${imageName}"?\n\n` +
                  `This action cannot be undone and will permanently remove the image from both the editor and server.`
                );
                
                if (confirmed) {
                  try {
                    const deleted = await deleteImageFromServer(imageUrl);
                    if (deleted) {
                      editor.dom.remove(selectedNode);
                      editor.nodeChanged();
                      
                      const content = editor.getContent();
                      onChange(content);
                      
                      editor.notificationManager.open({
                        text: '✅ Image deleted successfully',
                        type: 'success',
                        timeout: 3000
                      });
                    } else {
                      editor.notificationManager.open({
                        text: '❌ Failed to delete image from server',
                        type: 'error',
                        timeout: 5000
                      });
                    }
                  } catch (error) {
                    console.error('Delete image error:', error);
                    editor.notificationManager.open({
                      text: '❌ Error deleting image',
                      type: 'error',
                      timeout: 5000
                    });
                  }
                }
              }
            }
          });
          
          editor.on('change input undo redo', () => {
            const content = editor.getContent();
            onChange(content);
            
            const body = editor.getBody();
            if (body) {
              const isEmpty = editor.getContent({ format: 'text' }).trim() === '';
              if (isEmpty) {
                body.setAttribute('data-mce-placeholder', placeholder);
              } else {
                body.removeAttribute('data-mce-placeholder');
              }
            }
          });
          
          editor.on('init', () => {
            setIsReady(true);
            
            if (value) {
              editor.setContent(value);
            } else {
              const body = editor.getBody();
              if (body) {
                body.setAttribute('data-mce-placeholder', placeholder);
              }
            }
            
            const container = editor.getContainer();
            if (container) {
              container.style.backgroundColor = '#1e293b';
              container.style.border = '1px solid #475569';
              container.style.borderRadius = '12px';
              container.style.overflow = 'hidden';
            }
          });
          
          editor.on('focus', () => {
            const body = editor.getBody();
            const isEmpty = editor.getContent({ format: 'text' }).trim() === '';
            if (isEmpty && body) {
              body.removeAttribute('data-mce-placeholder');
            }
          });
          
          editor.on('blur', () => {
            const body = editor.getBody();
            const isEmpty = editor.getContent({ format: 'text' }).trim() === '';
            if (isEmpty && body) {
              body.setAttribute('data-mce-placeholder', placeholder);
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
  }, [isMounted, editorId, placeholder]);

  useEffect(() => {
    if (editorRef.current && isReady && value !== editorRef.current.getContent()) {
      editorRef.current.setContent(value || '');
    }
  }, [value, isReady]);

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

  return (
    <div className={className}>
      {!isReady && (
        <div 
          className="border border-slate-700 rounded-xl bg-slate-800/50 p-4 flex items-center justify-center" 
          style={{ height: height }}
        >
          <div className="flex items-center gap-2 text-violet-400">
            <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading TinyMCE editor...</span>
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
  className = ""
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  height?: number;
  showHelpText?: string;
  className?: string;
}) => {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-300 mb-2">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <SelfHostedTinyMCE
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        height={height}
        className="w-full"
      />
      {showHelpText && (
        <p className="text-xs text-slate-400 mt-1">
          {showHelpText}
        </p>
      )}
  
    </div>
  );
};
