"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import type { Post } from "@repo/shared";
import { Button } from "@repo/ui";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@repo/ui";
import { isClerkEnabled } from "../../../lib/clerk";

export default function PostsPage() {
  const { getToken } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/posts");
      const data = (await res.json()) as { success: boolean; data: Post[] };
      if (data.success) setPosts(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = isClerkEnabled ? await getToken() : null;
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ title, content }),
    });
    const data = (await res.json()) as { success: boolean; data: Post };
    if (data.success) {
      setPosts((prev) => [data.data, ...prev]);
      setTitle("");
      setContent("");
    }
  };

  const handleDelete = async (id: string) => {
    const token = isClerkEnabled ? await getToken() : null;
    const res = await fetch(`/api/posts/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = (await res.json()) as { success: boolean };
    if (data.success) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-screen-xl px-4 py-16 text-center">
        <p className="text-muted-foreground">Loading posts...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Posts</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Create New Post</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
            <input
              type="text"
              placeholder="Post title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
            />
            <textarea
              placeholder="Write your content..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={4}
              className="bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
            />
            <Button type="submit">Publish</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {posts.length === 0 ? (
          <p className="text-muted-foreground text-center">No posts yet. Create one above!</p>
        ) : (
          posts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{post.title}</CardTitle>
                    <CardDescription>
                      {new Date(post.createdAt).toLocaleDateString()} &middot; {post.status}
                    </CardDescription>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => void handleDelete(post.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{post.content}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
