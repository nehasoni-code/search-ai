# Azure Configuration Guide

This application requires Azure Cognitive Search and Azure Storage credentials to function properly.

## Required Environment Variables

You need to configure the following environment variables in your Supabase project:

### How to Add Environment Variables in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** → **Edge Functions**
3. Scroll to **Secrets** section
4. Add each of the following secrets:

### Azure Cognitive Search Configuration

```
AZURE_SEARCH_ENDPOINT=
```
**Example**: `https://your-search-service.search.windows.net`

**Where to find it**:
- Go to Azure Portal → Your Search Service → Overview
- Copy the URL shown

---

```
AZURE_SEARCH_KEY=
```
**Example**: `A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6`

**Where to find it**:
- Go to Azure Portal → Your Search Service → Keys
- Copy either the Primary or Secondary admin key

---

```
AZURE_SEARCH_INDEX=
```
**Example**: `documents-index` or `azureblob-index`

**Where to find it**:
- Go to Azure Portal → Your Search Service → Indexes
- Copy the name of the index you want to search

---

### Azure Storage Configuration

```
AZURE_STORAGE_ACCOUNT=
```
**Example**: `mystorageaccount`

**Where to find it**:
- Go to Azure Portal → Your Storage Account → Overview
- Copy the Storage account name

---

```
AZURE_STORAGE_KEY=
```
**Example**: `A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6==`

**Where to find it**:
- Go to Azure Portal → Your Storage Account → Access keys
- Copy either key1 or key2

---

```
AZURE_STORAGE_CONTAINER=
```
**Example**: `documents` or `uploads`

**Where to find it**:
- Go to Azure Portal → Your Storage Account → Containers
- Copy the name of the container you want to access

---

## Quick Setup Checklist

- [ ] Create Azure Cognitive Search service (if not already created)
- [ ] Create a search index with your documents
- [ ] Create Azure Storage account (if not already created)
- [ ] Create a blob container in your storage account
- [ ] Copy all 6 environment variables from Azure Portal
- [ ] Add all variables to Supabase Edge Functions secrets
- [ ] Redeploy edge functions (Supabase does this automatically)
- [ ] Test the application by creating a new conversation and asking a question

## Testing Your Configuration

After adding the secrets:

1. Open the application
2. Create a new conversation thread
3. Ask a question related to your indexed documents
4. You should see search results with citations

If you encounter errors:
- Check that all secret names are spelled exactly as shown above
- Verify your Azure Search index has documents
- Ensure your Azure credentials are valid and have not expired
- Check the Supabase Edge Functions logs for detailed error messages

## Azure Service Setup (If Starting Fresh)

### Setting Up Azure Cognitive Search

1. Go to Azure Portal
2. Create a new **Azure AI Search** resource
3. Once created, go to **Import data** to create an index:
   - Choose your data source (Azure Blob Storage, SQL, etc.)
   - Configure the indexer
   - Define the index schema
4. Wait for documents to be indexed

### Setting Up Azure Storage

1. Go to Azure Portal
2. Create a new **Storage account**
3. Under **Data storage**, click **Containers**
4. Create a new container (e.g., "documents")
5. Upload files to the container

## Cost Considerations

- Azure Cognitive Search: Charges based on tier (Free, Basic, Standard)
- Azure Storage: Charges based on storage used and transactions
- Free tier is available for testing and small workloads

## Support

For issues with:
- **Azure services**: Refer to Azure documentation or Azure Support
- **Application functionality**: Check application logs and Supabase dashboard
