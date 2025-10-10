-- CreateIndex
CREATE UNIQUE INDEX "Report_reporterId_targetId_postId_commentId_messageId_key" ON "Report"("reporterId", "targetId", "postId", "commentId", "messageId");
