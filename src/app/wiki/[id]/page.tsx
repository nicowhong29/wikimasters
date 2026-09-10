import { notFound } from "next/navigation";
import WikiArticleViewer from "@/components/wiki-article-viewer";
import { authorizeUserToEditArticle } from "@/db/authz";
import { getArticleById } from "@/lib/data/articles";
import { stackServerApp } from "@/stack/server";

interface ViewArticlePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ViewArticlePage({
  params,
}: ViewArticlePageProps) {
  const { id } = await params;
  const article = await getArticleById(+id);

  if (!article) {
    notFound();
  }

  const user = await stackServerApp.getUser();
  const canEdit =
    user !== null && (await authorizeUserToEditArticle(user.id, +id));

  return <WikiArticleViewer article={article} canEdit={canEdit} />;
}
