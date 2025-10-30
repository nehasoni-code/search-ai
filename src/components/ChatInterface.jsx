import React, { useState, useEffect, useRef } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { supabase } from '../supabaseClient';
import './ChatInterface.css';

function ChatInterface({ thread, onUpdateTitle }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

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
        throw new Error('Search failed');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Azure Search error:', error);
      return { count: 0, results: [] };
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

      const searchResults = await searchAzure(content);

      await supabase
        .from('search_history')
        .insert([{
          thread_id: thread.id,
          query: content,
          results_count: searchResults.count || 0,
        }]);

      let assistantResponse = '';
      if (searchResults.count > 0) {
        assistantResponse = `Based on the search results, I found ${searchResults.count} relevant document(s).\n\n`;

        searchResults.results.slice(0, 3).forEach((result, index) => {
          assistantResponse += `**Source ${index + 1}:**\n`;
          if (result.content) {
            const snippet = result.content.substring(0, 200);
            assistantResponse += `${snippet}${result.content.length > 200 ? '...' : ''}\n\n`;
          }
        });
      } else {
        assistantResponse = 'I searched the knowledge base but did not find specific documents matching your query. Please try rephrasing your question or ensure the Azure Search index is configured.';
      }

      const assistantMessage = {
        thread_id: thread.id,
        role: 'assistant',
        content: assistantResponse,
        sources: searchResults.count > 0 ? searchResults.results : null,
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
              <h3>Azure Storage</h3>
              <p>Access files from your storage account</p>
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
      </div>
      <MessageList messages={messages} loading={loading} />
      <MessageInput onSend={handleSendMessage} disabled={sending} />
    </main>
  );
}

export default ChatInterface;
