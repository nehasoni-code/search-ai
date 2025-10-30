/*
  # Chat Application Schema

  ## Overview
  Creates the database schema for a chat application with Azure Cognitive Search integration.
  Supports conversation threads, messages, and file references from Azure Storage.

  ## New Tables
  
  ### `threads`
  - `id` (uuid, primary key) - Unique thread identifier
  - `user_id` (uuid, nullable) - User who created the thread (for future auth integration)
  - `title` (text) - Thread title/summary
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### `messages`
  - `id` (uuid, primary key) - Unique message identifier
  - `thread_id` (uuid, foreign key) - Reference to parent thread
  - `role` (text) - Message role: 'user', 'assistant', or 'system'
  - `content` (text) - Message content
  - `sources` (jsonb, nullable) - Citations/sources from Azure Search
  - `created_at` (timestamptz) - Creation timestamp
  
  ### `search_history`
  - `id` (uuid, primary key) - Unique search identifier
  - `thread_id` (uuid, foreign key) - Reference to parent thread
  - `query` (text) - Search query text
  - `results_count` (integer) - Number of results returned
  - `created_at` (timestamptz) - Search timestamp

  ## Security
  - Enable RLS on all tables
  - Public access policies (authentication can be added later)
  
  ## Notes
  - JSONB used for flexible source/citation storage
  - Cascade delete to maintain referential integrity
  - Indexes on foreign keys for query performance
*/

-- Create threads table
CREATE TABLE IF NOT EXISTS threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  title text NOT NULL DEFAULT 'New Conversation',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  sources jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create search history table
CREATE TABLE IF NOT EXISTS search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  query text NOT NULL,
  results_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_thread_id ON search_history(thread_id);
CREATE INDEX IF NOT EXISTS idx_threads_created_at ON threads(created_at DESC);

-- Enable Row Level Security
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (can be restricted later with auth)
CREATE POLICY "Allow public read access to threads"
  ON threads FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to threads"
  ON threads FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to threads"
  ON threads FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to threads"
  ON threads FOR DELETE
  USING (true);

CREATE POLICY "Allow public read access to messages"
  ON messages FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to messages"
  ON messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public read access to search_history"
  ON search_history FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to search_history"
  ON search_history FOR INSERT
  WITH CHECK (true);

-- Create function to update thread timestamp
CREATE OR REPLACE FUNCTION update_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE threads SET updated_at = now() WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update thread timestamp when messages are added
CREATE TRIGGER update_thread_on_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_timestamp();