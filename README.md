# Azure AI Chat Application

A web application that integrates Azure Cognitive Search with conversation threading, allowing users to search through documents and maintain contextual conversations.

## Features

- **Azure Cognitive Search Integration**: Search through indexed documents stored in Azure AI Search
- **Azure Storage Access**: Connect to Azure Blob Storage for file management
- **Threaded Conversations**: Create and manage multiple conversation threads with persistent history
- **Real-time Chat Interface**: Ask questions and receive answers based on your document corpus
- **Source Citations**: View document sources that informed each response

## Prerequisites

To use Azure services, you'll need to configure the following environment variables in the Supabase Edge Functions dashboard:

- `AZURE_SEARCH_ENDPOINT`: Your Azure Cognitive Search endpoint URL
- `AZURE_SEARCH_KEY`: Your Azure Cognitive Search admin key
- `AZURE_SEARCH_INDEX`: Your search index name
- `AZURE_STORAGE_ACCOUNT`: Your Azure Storage account name
- `AZURE_STORAGE_KEY`: Your Azure Storage account key
- `AZURE_STORAGE_CONTAINER`: Your blob container name

## Database Schema

The application uses Supabase with the following tables:

- **threads**: Stores conversation threads
- **messages**: Stores individual messages with role (user/assistant) and content
- **search_history**: Tracks search queries and results

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure your Azure credentials in the Supabase Edge Functions environment variables

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Architecture

- **Frontend**: React with Vite for fast development and building
- **Database**: Supabase (PostgreSQL) for conversation persistence
- **Backend**: Supabase Edge Functions for Azure service integration
- **Search**: Azure Cognitive Search for document retrieval
- **Storage**: Azure Blob Storage for file access

## Usage

1. Click "+ New" to create a conversation thread
2. Ask questions in natural language
3. The system searches Azure Cognitive Search and returns relevant information
4. View source citations for each response
5. All conversations are automatically saved and can be resumed later
