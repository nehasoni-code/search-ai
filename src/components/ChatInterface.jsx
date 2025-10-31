import React, { useState, useEffect, useRef } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { supabase } from '../supabaseClient';
import './ChatInterface.css';

function ChatInterface({ thread, onUpdateTitle }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchSource, setSearchSource] = useState('sharepoint');

  useEffect(() => {
    if (thread) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [thread]);

  const loadMessages = async () => {
    if (!thread) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchAzure = async (query) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/azure-search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            top: 3,
            azureConfig: {
              endpoint: import.meta.env.VITE_AZURE_SEARCH_ENDPOINT,
              key: import.meta.env.VITE_AZURE_SEARCH_KEY,
              index: import.meta.env.VITE_AZURE_SEARCH_INDEX,
            }
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Azure Blob search failed');
      }

      const data = await response.json();
      console.log('Azure Blob Search Response:', data);
      return data;
    } catch (error) {
      console.error('Azure Blob Search error:', error);
      return { count: 0, results: [], error: error.message };
    }
  };

  const searchSharePoint = async (query) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/azure-search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            top: 3,
            azureConfig: {
              endpoint: import.meta.env.VITE_AZURE_SEARCH_ENDPOINT,
              key: import.meta.env.VITE_AZURE_SEARCH_KEY,
              index: import.meta.env.VITE_SHAREPOINT_SEARCH_INDEX,
            }
          }),
        }
      );

      if (!response.ok) {
        throw new Error('SharePoint search failed');
      }

      const data = await response.json();
      console.log('SharePoint Search Response:', data);

      if (data.results && data.results.length > 0) {
        console.log('SharePoint First Result Fields:', Object.keys(data.results[0]));
        console.log('SharePoint First Result:', data.results[0]);
      }

      return data;
    } catch (error) {
      console.error('SharePoint Search error:', error);
      return { count: 0, results: [], error: error.message };
    }
  };

  const handleSendMessage = async (content) => {
    if (!thread || !content.trim()) return;

    setSending(true);

    try {
      const userMessage = {
        thread_id: thread.id,
        role: 'user',
        content: content.trim(),
      };

      const { data: savedUserMsg, error: userError } = await supabase
        .from('messages')
        .insert([userMessage])
        .select()
        .single();

      if (userError) throw userError;
      setMessages(prev => [...prev, savedUserMsg]);

      if (messages.length === 0) {
        const firstWords = content.trim().split(' ').slice(0, 6).join(' ');
        const title = firstWords.length < content.length ? `${firstWords}...` : firstWords;
        onUpdateTitle(thread.id, title);
      }

      let azureBlobResults = { count: 0, results: [] };
      let sharePointResults = { count: 0, results: [] };

      if (searchSource === 'storage') {
        azureBlobResults = await searchAzure(content);
      } else if (searchSource === 'sharepoint') {
        sharePointResults = await searchSharePoint(content);
      }

      const totalResults = (azureBlobResults.count || 0) + (sharePointResults.count || 0);

      await supabase
        .from('search_history')
        .insert([{
          thread_id: thread.id,
          query: content,
          results_count: totalResults,
        }]);

      let assistantResponse = '';

      if (totalResults > 0) {
        assistantResponse = `I found ${totalResults} relevant document(s) from your knowledge sources.\n\n`;

        if (azureBlobResults.count > 0) {
          assistantResponse += `**Azure Blob Storage (${azureBlobResults.count} documents):**\n\n`;
          azureBlobResults.results.slice(0, 2).forEach((result, index) => {
            assistantResponse += `**Source ${index + 1}:**\n`;
            if (result.content) {
              const snippet = result.content.substring(0, 150);
              assistantResponse += `${snippet}${result.content.length > 150 ? '...' : ''}\n\n`;
            }
          });
        }

        if (sharePointResults.count > 0) {
          assistantResponse += `**SharePoint (${sharePointResults.count} documents):**\n\n`;
          sharePointResults.results.slice(0, 2).forEach((result, index) => {
            assistantResponse += `**Document ${index + 1}:**\n`;

            const contentField = result.content || result.merged_content || result.text || result.body || result.description || '';
            const titleField = result.title || result.metadata_storage_name || result.filename || 'Untitled';

            if (titleField && titleField !== 'Untitled') {
              assistantResponse += `Title: ${titleField}\n`;
            }

            if (contentField) {
              const snippet = contentField.substring(0, 200);
              assistantResponse += `${snippet}${contentField.length > 200 ? '...' : ''}\n\n`;
            } else {
              assistantResponse += 'Content preview not available\n\n';
            }
          });
        }
      } else {
        assistantResponse = 'I searched your knowledge sources but did not find specific documents matching your query.';

        if (azureBlobResults.error || sharePointResults.error) {
          assistantResponse += `\n\nErrors:\n`;
          if (azureBlobResults.error) assistantResponse += `- Azure Blob: ${azureBlobResults.error}\n`;
          if (sharePointResults.error) assistantResponse += `- SharePoint: ${sharePointResults.error}\n`;
        }

        if (azureBlobResults.debugInfo) {
          assistantResponse += `\n\nAzure Blob Debug Info:\n- Endpoint: ${azureBlobResults.debugInfo.endpoint}\n- Index: ${azureBlobResults.debugInfo.index}\n- Total Results: ${azureBlobResults.debugInfo.totalResults || 0}`;
        }

        if (sharePointResults.debugInfo) {
          assistantResponse += `\n\nSharePoint Debug Info:\n- Endpoint: ${sharePointResults.debugInfo.endpoint}\n- Index: ${sharePointResults.debugInfo.index}\n- Total Results: ${sharePointResults.debugInfo.totalResults || 0}`;
        }

        assistantResponse += '\n\nPlease check:\n1. Your search indexes have documents\n2. The index names are correct\n3. The credentials are valid';
      }

      const allSources = [
        ...(azureBlobResults.results || []),
        ...(sharePointResults.results || [])
      ];

      const assistantMessage = {
        thread_id: thread.id,
        role: 'assistant',
        content: assistantResponse,
        sources: totalResults > 0 ? allSources : null,
      };

      const { data: savedAssistantMsg, error: assistantError } = await supabase
        .from('messages')
        .insert([assistantMessage])
        .select()
        .single();

      if (assistantError) throw assistantError;
      setMessages(prev => [...prev, savedAssistantMsg]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  if (!thread) {
    return (
      <main className="chat-interface">
        <div className="empty-chat">
          <h1>Azure AI Chat</h1>
          <p>Select a conversation or create a new one to start chatting</p>
          <div className="features">
            <div className="feature">
              <span className="feature-icon">🔍</span>
              <h3>Azure Cognitive Search</h3>
              <p>Search through your indexed documents</p>
            </div>
            <div className="feature">
              <span className="feature-icon">💬</span>
              <h3>Threaded Conversations</h3>
              <p>Maintain context across multiple messages</p>
            </div>
            <div className="feature">
              <span className="feature-icon">📁</span>
              <h3>Multi-Source Search</h3>
              <p>Search across Azure Blob Storage and SharePoint</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="chat-interface">
      <div className="chat-header">
        <h2>{thread.title}</h2>
        <div className="source-toggle">
          <label htmlFor="search-source">Search Source:</label>
          <select
            id="search-source"
            value={searchSource}
            onChange={(e) => setSearchSource(e.target.value)}
            className="source-select"
          >
            <option value="sharepoint">SharePoint</option>
            <option value="storage">Azure Blob Storage</option>
          </select>
        </div>
      </div>
      <MessageList messages={messages} loading={loading} />
      <MessageInput onSend={handleSendMessage} disabled={sending} />
    </main>
  );
}

export default ChatInterface;
