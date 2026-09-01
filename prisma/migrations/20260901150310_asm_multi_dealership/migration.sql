-- CreateTable
CREATE TABLE "_AsmDealerships" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_AsmDealerships_AB_unique" ON "_AsmDealerships"("A", "B");

-- CreateIndex
CREATE INDEX "_AsmDealerships_B_index" ON "_AsmDealerships"("B");

-- AddForeignKey
ALTER TABLE "_AsmDealerships" ADD CONSTRAINT "_AsmDealerships_A_fkey" FOREIGN KEY ("A") REFERENCES "Dealership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsmDealerships" ADD CONSTRAINT "_AsmDealerships_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
