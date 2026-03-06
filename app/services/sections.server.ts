import db from "../db.server";

export async function getOrCreateShop(domain: string) {
  return db.shop.upsert({
    where: { domain },
    create: { domain },
    update: {},
  });
}

export async function getSections({
  query,
  category,
  priceFilter,
  shopId,
  showOwned,
  showFavorites,
  sort = "popular",
  limit = 40,
  offset = 0,
}: {
  query?: string;
  category?: string;
  priceFilter?: "free" | "paid" | "all";
  shopId?: string;
  showOwned?: boolean;
  showFavorites?: boolean;
  sort?: string;
  limit?: number;
  offset?: number;
}) {
  const where: any = { isPublished: true };

  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      { category: { contains: query, mode: "insensitive" } },
      { handle: { contains: query, mode: "insensitive" } },
      { tags: { hasSome: [query.toLowerCase()] } },
    ];
  }

  if (category && category !== "all") {
    where.category = category;
  }

  if (priceFilter === "free") {
    where.price = 0;
  } else if (priceFilter === "paid") {
    where.price = { gt: 0 };
  }

  if (showOwned && shopId) {
    where.ownerships = { some: { shopId } };
  }

  if (showFavorites && shopId) {
    where.favorites = { some: { shopId } };
  }

  let orderBy: any;
  switch (sort) {
    case "newest":
      orderBy = { createdAt: "desc" };
      break;
    case "price-low":
      orderBy = { price: "asc" };
      break;
    case "price-high":
      orderBy = { price: "desc" };
      break;
    case "popular":
    default:
      orderBy = [{ isFeatured: "desc" }, { sortOrder: "asc" }];
      break;
  }

  const [sections, total] = await Promise.all([
    db.section.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
      include: {
        files: { orderBy: { sortOrder: "asc" } },
        ...(shopId
          ? {
              ownerships: { where: { shopId }, select: { id: true } },
              favorites: { where: { shopId }, select: { id: true } },
            }
          : {}),
      },
    }),
    db.section.count({ where }),
  ]);

  return { sections, total };
}

export async function getSectionByHandle(handle: string, shopId?: string) {
  return db.section.findUnique({
    where: { handle },
    include: {
      files: { orderBy: { sortOrder: "asc" } },
      ...(shopId
        ? {
            ownerships: { where: { shopId }, select: { id: true } },
            favorites: { where: { shopId }, select: { id: true } },
          }
        : {}),
    },
  });
}

export async function getShopSections(shopId: string) {
  return db.sectionOwnership.findMany({
    where: { shopId },
    include: {
      section: {
        include: { files: { orderBy: { sortOrder: "asc" } } },
      },
    },
    orderBy: { purchasedAt: "desc" },
  });
}

export async function getShopFavorites(shopId: string) {
  return db.sectionFavorite.findMany({
    where: { shopId },
    include: { section: true },
  });
}

export async function toggleFavorite(shopId: string, sectionId: string) {
  const existing = await db.sectionFavorite.findUnique({
    where: { shopId_sectionId: { shopId, sectionId } },
  });

  if (existing) {
    await db.sectionFavorite.delete({ where: { id: existing.id } });
    return false;
  }

  await db.sectionFavorite.create({ data: { shopId, sectionId } });
  return true;
}

export async function recordOwnership(
  shopId: string,
  sectionId: string,
  chargeId?: string,
) {
  return db.sectionOwnership.upsert({
    where: { shopId_sectionId: { shopId, sectionId } },
    create: { shopId, sectionId, chargeId },
    update: { chargeId },
  });
}

export async function getCategories() {
  const results = await db.section.groupBy({
    by: ["category"],
    where: { isPublished: true },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });
  return results.map((r) => ({ name: r.category, count: r._count.id }));
}

export async function getBundles(shopId?: string) {
  return db.bundle.findMany({
    where: { isActive: true },
    include: {
      items: {
        include: { section: true },
      },
      ...(shopId
        ? { purchases: { where: { shopId }, select: { id: true } } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getBundleByHandle(handle: string, shopId?: string) {
  return db.bundle.findUnique({
    where: { handle },
    include: {
      items: {
        include: {
          section: {
            include: { files: true },
          },
        },
      },
      ...(shopId
        ? { purchases: { where: { shopId }, select: { id: true } } }
        : {}),
    },
  });
}

export async function recordBundlePurchase(
  shopId: string,
  bundleId: string,
  chargeId?: string,
) {
  const bundle = await db.bundle.findUnique({
    where: { id: bundleId },
    include: { items: true },
  });

  if (!bundle) throw new Error("Bundle not found");

  await db.$transaction([
    db.bundlePurchase.upsert({
      where: { shopId_bundleId: { shopId, bundleId } },
      create: { shopId, bundleId, chargeId },
      update: { chargeId },
    }),
    ...bundle.items.map((item) =>
      db.sectionOwnership.upsert({
        where: { shopId_sectionId: { shopId, sectionId: item.sectionId } },
        create: { shopId, sectionId: item.sectionId, chargeId },
        update: {},
      }),
    ),
  ]);
}
