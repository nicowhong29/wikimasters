"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import redis from "@/cache";
import { authorizeUserToEditArticle } from "@/db/authz";
import db from "@/db/index";
import { articles } from "@/db/schema";
import { ensureUserExists } from "@/db/sync-user";
import { stackServerApp } from "@/stack/server";

// Server actions for articles (stubs)
// TODO: Replace with real database operations when ready

export type CreateArticleInput = {
  title: string;
  content: string;
  authorId: string;
  imageUrl?: string;
};

export type UpdateArticleInput = {
  title?: string;
  content?: string;
  imageUrl?: string;
};

export type DeleteArticleState = {
  success: boolean;
  message: string;
} | null;

export async function createArticle(data: CreateArticleInput) {
  const user = await stackServerApp.getUser();
  if (!user) {
    throw new Error("❌ Unauthorized");
  }

  await ensureUserExists(user);
  await db.insert(articles).values({
    title: data.title,
    content: data.content,
    slug: `${Date.now()}`,
    published: true,
    authorId: user.id,
    imageUrl: data.imageUrl || undefined,
  });

  redis.del("articles:all");

  return { success: true, message: "Article create logged (stub)" };
}

export async function updateArticle(id: string, data: UpdateArticleInput) {
  const user = await stackServerApp.getUser();
  if (!user) {
    throw new Error("❌ Unauthorized");
  }

  if (!(await authorizeUserToEditArticle(user.id, +id))) {
    return {
      success: false,
      message: "You are not the owner of this article.",
    };
  }

  // TODO: Replace with actual database update
  console.log("📝 updateArticle called:", { id, ...data });

  await db
    .update(articles)
    .set({
      title: data.title,
      content: data.content,
      imageUrl: data.imageUrl ?? undefined,
    })
    .where(eq(articles.id, +id));

  return { success: true, message: `Article ${id} update logged (stub)` };
}

export async function deleteArticle(id: string) {
  const user = await stackServerApp.getUser();
  if (!user) {
    throw new Error("❌ Unauthorized");
  }

  if (!(await authorizeUserToEditArticle(user.id, +id))) {
    return {
      success: false,
      message: "You are not the owner of this article.",
    };
  }

  await db.delete(articles).where(eq(articles.id, +id));
  await redis.del("articles:all");

  return { success: true, message: `Article ${id} deleted` };
}

// Form-friendly server action: accepts FormData from a client form and calls deleteArticle
export async function deleteArticleForm(
  _previousState: DeleteArticleState,
  formData: FormData,
): Promise<DeleteArticleState> {
  const id = formData.get("id");
  if (typeof id !== "string" || !/^\d+$/.test(id)) {
    return { success: false, message: "Missing article id." };
  }

  try {
    const result = await deleteArticle(id);
    if (!result.success) {
      return result;
    }
  } catch (error) {
    console.error("Delete article failed:", error);
    return {
      success: false,
      message: "The article could not be deleted. Please try again.",
    };
  }

  redirect("/");
}
