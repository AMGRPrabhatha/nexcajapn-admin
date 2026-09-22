"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from '@supabase/ssr';
import { Trash2, Plus, Image as ImageIcon, ExternalLink, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { addGalleryItemAction, deleteGalleryItemAction } from "@/actions/admin";

interface GalleryItem {
  id: string;
  title: string;
  images: string[];
  created_at: string;
}

export default function AdminGalleryPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch gallery items
  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gallery_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn("Could not fetch gallery_items:", error.message);
      } else {
        setItems(data || []);
        if (data && data.length > 0) {
          try {
            localStorage.setItem('nexca_local_gallery', JSON.stringify(data));
          } catch (e) {}
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Handle image files selection (max 3 images)
  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 3);
      setSelectedFiles(files);

      // Create preview object URLs
      const urls = files.map((file) => URL.createObjectURL(file));
      setPreviewUrls(urls);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newUrls = previewUrls.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setPreviewUrls(newUrls);
  };

  // Submit new gallery card
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least 1 image (up to 3).' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const uploadedUrls: string[] = [];

      // 1. Upload each image to Supabase Storage 'car-images' bucket
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `gallery-${Date.now()}-${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('car-images')
          .upload(fileName, file);

        if (uploadError) {
          throw new Error("Storage upload error: " + uploadError.message);
        }

        const { data: publicUrlData } = supabase.storage
          .from('car-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrlData.publicUrl);
      }

      // 2. Insert record via Server Action securely
      await addGalleryItemAction({
        title: title.trim() || 'Vehicle Showcase',
        images: uploadedUrls,
      });

      // Save to localStorage cache as well
      try {
        const cached = JSON.parse(localStorage.getItem('nexca_local_gallery') || '[]');
        const newItem = {
          id: `gallery-${Date.now()}`,
          title: title.trim() || 'Vehicle Showcase',
          images: uploadedUrls,
          created_at: new Date().toISOString()
        };
        localStorage.setItem('nexca_local_gallery', JSON.stringify([newItem, ...cached]));
      } catch (e) {}

      setMessage({ type: 'success', text: 'Gallery item published successfully!' });
      setTitle('');
      setSelectedFiles([]);
      setPreviewUrls([]);
      fetchItems();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save gallery item.' });
    } finally {
      setUploading(false);
    }
  };

  // Delete item
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this gallery item?")) return;

    // Remove from localStorage
    try {
      const cached = JSON.parse(localStorage.getItem('nexca_local_gallery') || '[]');
      localStorage.setItem('nexca_local_gallery', JSON.stringify(cached.filter((it: any) => it.id !== id)));
    } catch (e) {}

    try {
      await deleteGalleryItemAction(id);
      setItems(items.filter((item) => item.id !== id));
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manage Vehicle Gallery</h2>
          <p className="text-gray-500 text-sm mt-1">
            Add cards with up to 3 auto-scrolling images to display on the public Gallery page.
          </p>
        </div>
        <Link
          href="/gallery"
          target="_blank"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium transition-colors"
        >
          <span>View Public Gallery</span>
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      {/* Upload Form Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-600" />
          Add New Gallery Item (Max 3 Images)
        </h3>

        {message && (
          <div
            className={`p-4 rounded-lg mb-6 flex items-start gap-3 text-sm ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-semibold">{message.text}</p>
              {message.type === 'error' && (
                <div className="mt-2 text-xs bg-white/80 p-3 rounded border border-red-200">
                  <p className="font-bold text-red-900 mb-1">How to fix this in Supabase (1-Step):</p>
                  <p className="text-gray-700 mb-2">
                    Open your <b>Supabase Dashboard → SQL Editor</b> and run this command:
                  </p>
                  <pre className="bg-gray-900 text-emerald-400 p-2.5 rounded font-mono text-[11px] overflow-x-auto select-all">
{`GRANT ALL ON TABLE gallery_items TO anon, authenticated, service_role;
ALTER TABLE gallery_items DISABLE ROW LEVEL SECURITY;`}
                  </pre>
                  <p className="text-gray-500 mt-2">
                    Then click "Add to Gallery" again.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle Title / Description
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 2022 Toyota Land Cruiser Prado TX (Pearl White)"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Images (1 to 3 images max) *
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Select up to 3 photos of this vehicle. Cards with multiple images will automatically cycle/scroll through each photo on the public gallery.
            </p>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {/* Image Previews */}
          {previewUrls.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">
                Selected Images ({previewUrls.length}/3):
              </p>
              <div className="grid grid-cols-3 gap-4">
                {previewUrls.map((url, idx) => (
                  <div key={idx} className="relative aspect-[4/3] rounded-lg overflow-hidden border border-gray-200 group bg-gray-50">
                    <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 transition-colors"
                      title="Remove image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-bold">
                      Image {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || selectedFiles.length === 0}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
          >
            {uploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Uploading &amp; Saving...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Add to Gallery</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Existing Items Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            Published Gallery Items ({items.length})
          </h3>
          <button
            onClick={fetchItems}
            className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh List
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400 bg-white rounded-xl border border-gray-200">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading gallery items...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-gray-200 text-gray-500">
            <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-700 mb-1">No gallery items yet</p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Upload your first vehicle gallery item with up to 3 photos using the form above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col group">
                {/* Image display */}
                <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                  <img
                    src={item.images[0] || '/service-1.png'}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-black/70 text-white text-xs font-semibold backdrop-blur-sm">
                    {item.images.length} {item.images.length === 1 ? 'photo' : 'photos'}
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm mb-1 line-clamp-1">
                      {item.title}
                    </h4>
                    <p className="text-xs text-gray-400">
                      Added: {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-blue-600 font-medium">
                      Auto-scroll enabled
                    </span>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete card"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
