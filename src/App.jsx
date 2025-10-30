import React, { useState, useEffect } from 'react';
import ThreadList from './components/ThreadList';
import ChatInterface from './components/ChatInterface';
import { supabase } from './supabaseClient';
import './App.css';

function App() {
  const [threads, setThreads] = useState([]);
  const [currentThread, setCurrentThread] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadThreads();
  }, []);

  const loadThreads = async () => {
    try {
      const { data, error } = await supabase
        .from('threads')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setThreads(data || []);
    } catch (error) {
      console.error('Error loading threads:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewThread = async () => {
    try {
      const { data, error } = await supabase
        .from('threads')
        .insert([{ title: 'New Conversation' }])
        .select()
        .single();

      if (error) throw error;

      setThreads([data, ...threads]);
      setCurrentThread(data);
    } catch (error) {
      console.error('Error creating thread:', error);
    }
  };

  const deleteThread = async (threadId) => {
    try {
      const { error } = await supabase
        .from('threads')
        .delete()
        .eq('id', threadId);

      if (error) throw error;

      setThreads(threads.filter(t => t.id !== threadId));
      if (currentThread?.id === threadId) {
        setCurrentThread(null);
      }
    } catch (error) {
      console.error('Error deleting thread:', error);
    }
  };

  const updateThreadTitle = async (threadId, title) => {
    try {
      const { error } = await supabase
        .from('threads')
        .update({ title })
        .eq('id', threadId);

      if (error) throw error;

      setThreads(threads.map(t =>
        t.id === threadId ? { ...t, title } : t
      ));
    } catch (error) {
      console.error('Error updating thread:', error);
    }
  };

  return (
    <div className="app">
      <ThreadList
        threads={threads}
        currentThread={currentThread}
        onSelectThread={setCurrentThread}
        onNewThread={createNewThread}
        onDeleteThread={deleteThread}
        loading={loading}
      />
      <ChatInterface
        thread={currentThread}
        onUpdateTitle={updateThreadTitle}
      />
    </div>
  );
}

export default App;
