import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import { createPrismaAdapter } from "../src/lib/db/adapter";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run the seed");
}

const prisma = new PrismaClient({
  adapter: createPrismaAdapter(databaseUrl),
});

const CITLATLI_COMPANY_ID = "cm_citlatli_group";
const CITLATLI_LOCATION_ID = "loc_citlatli_roma";
const CITLATLI_TIMEZONE = "America/Mexico_City";
const BARCELO_COMPANY_ID = "cm_barcelo_group";
const CATALUNIA_LOCATION_ID = "loc_catalunia";
const BARCELO_TIMEZONE = "Europe/Madrid";

function businessDateFor(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

async function seedSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("Skipping super admin seed. Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD to create one.");
    return null;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      platformRole: "SUPER_ADMIN",
      emailVerifiedAt: new Date(),
    },
    create: {
      email,
      passwordHash,
      firstName: process.env.SUPER_ADMIN_FIRST_NAME ?? "Platform",
      lastName: process.env.SUPER_ADMIN_LAST_NAME ?? "Admin",
      platformRole: "SUPER_ADMIN",
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`Super admin ready: ${email}`);
  return user;
}

async function seedCitlatli(createdById?: string) {
  const company = await prisma.company.upsert({
    where: { slug: "citlatli" },
    update: { name: "Citlatli" },
    create: {
      id: CITLATLI_COMPANY_ID,
      name: "Citlatli",
      slug: "citlatli",
    },
  });

  const restaurant = await prisma.location.upsert({
    where: { companyId_slug: { companyId: company.id, slug: "citlatli" } },
    update: {
      name: "Citlatli",
      timezone: CITLATLI_TIMEZONE,
      addressLine1: "Av. Álvaro Obregón 128",
      city: "Mexico City",
      state: "CDMX",
      country: "MX",
    },
    create: {
      id: CITLATLI_LOCATION_ID,
      companyId: company.id,
      name: "Citlatli",
      slug: "citlatli",
      timezone: CITLATLI_TIMEZONE,
      addressLine1: "Av. Álvaro Obregón 128",
      city: "Mexico City",
      state: "CDMX",
      country: "MX",
    },
  });

  const scope = { companyId: company.id, locationId: restaurant.id };
  const businessDate = businessDateFor(CITLATLI_TIMEZONE);

  await prisma.$transaction([
    prisma.dailyOperations.deleteMany({ where: scope }),
    prisma.salesGoal.deleteMany({ where: scope }),
    prisma.menuItemStatus.deleteMany({ where: scope }),
    prisma.menuItem.deleteMany({ where: scope }),
    prisma.inventoryAdjustment.deleteMany({ where: scope }),
    prisma.inventoryItem.deleteMany({ where: scope }),
    prisma.wasteEntry.deleteMany({ where: scope }),
    prisma.managerIssue.deleteMany({ where: scope }),
    prisma.task.deleteMany({ where: scope }),
    prisma.taskTemplate.deleteMany({ where: scope }),
    prisma.workingEmployee.deleteMany({ where: scope }),
    prisma.staffShift.deleteMany({ where: scope }),
    prisma.restaurantEmployee.deleteMany({ where: scope }),
    prisma.managerLog.deleteMany({ where: scope }),
  ]);

  const priorDay = (offset: number) => {
    const next = new Date(businessDate);
    next.setUTCDate(next.getUTCDate() - offset);
    return next;
  };
  const weekStartDate = (() => {
    const weekday = businessDate.getUTCDay();
    const offset = weekday === 0 ? 6 : weekday - 1;
    return priorDay(offset);
  })();
  const monthStartDate = new Date(Date.UTC(businessDate.getUTCFullYear(), businessDate.getUTCMonth(), 1));

  await prisma.dailyOperations.createMany({
    data: [
      {
        ...scope,
        businessDate,
        salesAmount: 18450,
        salesGoal: 22000,
        covers: 86,
        laborCost: 4980,
        grossSales: 19840,
        netSales: 18450,
        foodSales: 12680,
        alcoholSales: 4920,
        otherSales: 850,
        discounts: 410,
        comps: 220,
        voids: 180,
        tax: 3170,
        orderCount: 71,
      },
      {
        ...scope,
        businessDate: priorDay(1),
        salesAmount: 16200,
        salesGoal: 22000,
        covers: 74,
        laborCost: 4510,
        grossSales: 17420,
        netSales: 16200,
        foodSales: 11140,
        alcoholSales: 4280,
        otherSales: 780,
        discounts: 360,
        comps: 190,
        voids: 140,
        tax: 2780,
        orderCount: 63,
      },
      {
        ...scope,
        businessDate: priorDay(2),
        salesAmount: 14980,
        salesGoal: 20000,
        covers: 68,
        laborCost: 4320,
        grossSales: 16110,
        netSales: 14980,
        foodSales: 10350,
        alcoholSales: 3920,
        otherSales: 710,
        discounts: 280,
        comps: 150,
        voids: 120,
        tax: 2560,
        orderCount: 58,
      },
    ],
  });

  await prisma.salesGoal.createMany({
    data: [
      { ...scope, period: "DAILY", periodStart: businessDate, amount: 22000 },
      { ...scope, period: "WEEKLY", periodStart: weekStartDate, amount: 140000 },
      { ...scope, period: "MONTHLY", periodStart: monthStartDate, amount: 580000 },
    ],
  });

  const menu = await Promise.all(
    [
      { name: "Branzino", category: "Plates" },
      { name: "House-made pasta", category: "Plates" },
      { name: "Duck carnitas", category: "Plates" },
      { name: "Chile en nogada", category: "Plates" },
      { name: "Guacamole", category: "Antojitos" },
      { name: "Esquites", category: "Antojitos" },
      { name: "Tacos al pastor", category: "Antojitos" },
      { name: "Mezcal Negroni", category: "Drinks" },
      { name: "Casa margarita", category: "Drinks" },
      { name: "Tres leches", category: "Desserts" },
    ].map((item) =>
      prisma.menuItem.create({
        data: { ...scope, ...item },
      }),
    ),
  );

  const byName = Object.fromEntries(menu.map((item) => [item.name, item]));
  const actorId = createdById ?? (await prisma.user.findFirst({ select: { id: true } }))?.id;

  if (actorId) {
    const later = new Date(Date.now() + 90 * 60 * 1000);
    await prisma.menuItemStatus.createMany({
      data: [
        {
          ...scope,
          menuItemId: byName["Branzino"].id,
          status: "EIGHTY_SIXED",
          remainingQuantity: 0,
          reason: "86 after the 7pm rush",
          estimatedAvailableAt: later,
          createdById: actorId,
        },
        {
          ...scope,
          menuItemId: byName["House-made pasta"].id,
          status: "EIGHTY_SIXED",
          remainingQuantity: 0,
          reason: "Pasta dough ran out",
          createdById: actorId,
        },
        {
          ...scope,
          menuItemId: byName["Mezcal Negroni"].id,
          status: "EIGHTY_SIXED",
          remainingQuantity: 0,
          reason: "Mezcal 86",
          createdById: actorId,
        },
        {
          ...scope,
          menuItemId: byName.Guacamole.id,
          status: "LOW_STOCK",
          remainingQuantity: 4,
          reason: "Avocados short",
          estimatedAvailableAt: later,
          createdById: actorId,
        },
        {
          ...scope,
          menuItemId: byName.Esquites.id,
          status: "LOW_STOCK",
          remainingQuantity: 6,
          reason: "Holding for the late seating",
          createdById: actorId,
        },
      ],
    });

    await prisma.menuItemStatus.create({
      data: {
        ...scope,
        menuItemId: byName["Duck carnitas"].id,
        status: "EIGHTY_SIXED",
        remainingQuantity: 0,
        reason: "Cleared after lunch",
        createdById: actorId,
        resolvedById: actorId,
        resolvedAt: new Date(),
      },
    });
  }

  const inventory = await Promise.all(
    [
      {
        name: "Avocado",
        category: "PRODUCE" as const,
        sku: "PRD-AVO",
        unit: "ea",
        quantityOnHand: 4,
        parLevel: 18,
        reorderLevel: 12,
        unitCost: 1.4,
        supplier: "Central de Abasto",
      },
      {
        name: "Oaxaca cheese",
        category: "DAIRY" as const,
        sku: "DRY-OAX",
        unit: "kg",
        quantityOnHand: 2,
        parLevel: 8,
        reorderLevel: 6,
        unitCost: 9.5,
        supplier: "Lacteos Roma",
      },
      {
        name: "Masa",
        category: "DRY_GOODS" as const,
        sku: "DRY-MSA",
        unit: "kg",
        quantityOnHand: 40,
        parLevel: 20,
        reorderLevel: 10,
        unitCost: 1.1,
        supplier: "Molino San Juan",
      },
      {
        name: "Limes",
        category: "PRODUCE" as const,
        sku: "PRD-LIM",
        unit: "kg",
        quantityOnHand: 3,
        parLevel: 10,
        reorderLevel: 8,
        unitCost: 2.2,
        supplier: "Central de Abasto",
      },
      {
        name: "Branzino",
        category: "SEAFOOD" as const,
        sku: "SEA-BRZ",
        unit: "ea",
        quantityOnHand: 0,
        parLevel: 12,
        reorderLevel: 4,
        unitCost: 18,
        supplier: "Pescados del Pacifico",
      },
      {
        name: "Short rib",
        category: "MEAT" as const,
        sku: "MET-SRB",
        unit: "kg",
        quantityOnHand: 7,
        parLevel: 10,
        reorderLevel: 4,
        unitCost: 14,
        supplier: "Carnes Hidalgo",
      },
      {
        name: "Mezcal espadin",
        category: "ALCOHOL" as const,
        sku: "ALC-MEZ",
        unit: "btl",
        quantityOnHand: 2,
        parLevel: 6,
        reorderLevel: 3,
        unitCost: 28,
        supplier: "Casa Agave",
      },
      {
        name: "Jamaica",
        category: "BEVERAGES" as const,
        sku: "BEV-JAM",
        unit: "kg",
        quantityOnHand: 5,
        parLevel: 4,
        reorderLevel: 2,
        unitCost: 6,
        supplier: "Central de Abasto",
      },
      {
        name: "To-go boats",
        category: "PAPER_GOODS" as const,
        sku: "PAP-BOAT",
        unit: "case",
        quantityOnHand: 1,
        parLevel: 3,
        reorderLevel: 2,
        unitCost: 22,
        supplier: "Empaques Roma",
      },
      {
        name: "Degreaser",
        category: "CLEANING" as const,
        sku: "CLN-DEG",
        unit: "gal",
        quantityOnHand: 3,
        parLevel: 2,
        reorderLevel: 1,
        unitCost: 11,
        supplier: "Limpieza Norte",
      },
    ].map((item) => prisma.inventoryItem.create({ data: { ...scope, ...item } })),
  );

  if (actorId) {
    await prisma.inventoryAdjustment.createMany({
      data: inventory.map((item) => ({
        ...scope,
        inventoryItemId: item.id,
        type: "CREATE" as const,
        quantityBefore: 0,
        quantityAfter: Number(item.quantityOnHand),
        quantityDelta: Number(item.quantityOnHand),
        reason: "Opening count",
        createdById: actorId,
      })),
    });
  }

  const inv = Object.fromEntries(inventory.map((item) => [item.name, item]));
  const day = (offset: number) => {
    const next = new Date(businessDate);
    next.setUTCDate(next.getUTCDate() - offset);
    return next;
  };

  if (actorId) {
    await prisma.wasteEntry.createMany({
      data: [
        {
          ...scope,
          inventoryItemId: inv.Branzino.id,
          businessDate,
          itemName: "Branzino",
          quantity: 1,
          unit: "ea",
          unitCost: 18,
          totalCost: 18,
          reason: "SPOILAGE",
          employeeId: actorId,
          shift: "DINNER",
          notes: "86 after the 7pm rush",
        },
        {
          ...scope,
          inventoryItemId: inv.Avocado.id,
          businessDate,
          itemName: "Avocado",
          quantity: 6,
          unit: "ea",
          unitCost: 1.4,
          totalCost: 8.4,
          reason: "PREP_WASTE",
          employeeId: actorId,
          shift: "LUNCH",
          notes: "Over-prepped guacamole",
        },
        {
          ...scope,
          inventoryItemId: inv.Limes.id,
          businessDate: day(1),
          itemName: "Limes",
          quantity: 2,
          unit: "kg",
          unitCost: 2.2,
          totalCost: 4.4,
          reason: "EXPIRED",
          employeeId: actorId,
          shift: "BREAKFAST",
        },
        {
          ...scope,
          inventoryItemId: inv["Short rib"].id,
          businessDate: day(2),
          itemName: "Short rib",
          quantity: 1,
          unit: "kg",
          unitCost: 14,
          totalCost: 14,
          reason: "OVERCOOKED",
          employeeId: actorId,
          shift: "DINNER",
        },
        {
          ...scope,
          inventoryItemId: inv["Mezcal espadin"].id,
          businessDate: day(3),
          itemName: "Mezcal espadin",
          quantity: 1,
          unit: "btl",
          unitCost: 28,
          totalCost: 28,
          reason: "DROPPED",
          employeeId: actorId,
          shift: "LATE",
          notes: "Bottle broke on the bar rail",
        },
        {
          ...scope,
          inventoryItemId: inv["Oaxaca cheese"].id,
          businessDate: day(5),
          itemName: "Oaxaca cheese",
          quantity: 0.5,
          unit: "kg",
          unitCost: 9.5,
          totalCost: 4.75,
          reason: "CUSTOMER_RETURN",
          employeeId: actorId,
          shift: "LUNCH",
        },
      ],
    });
  }

  await prisma.managerIssue.createMany({
    data: [
      { ...scope, title: "Walk-in warmer than spec" },
      { ...scope, title: "Allergy note on table 12" },
    ],
  });

  const nextBusiness = new Date(businessDate);
  nextBusiness.setUTCDate(nextBusiness.getUTCDate() + 1);
  const localTime = (time: string, day = businessDate) => new Date(`${day.toISOString().slice(0, 10)}T${time}:00-06:00`);
  const roster = await Promise.all(
    [
      { name: "Ana Ruiz", position: "SERVER" as const, hourlyRate: 18 },
      { name: "Diego Morales", position: "COOK" as const, hourlyRate: 22 },
      { name: "Sofia Herrera", position: "BARTENDER" as const, hourlyRate: 20 },
      { name: "Mateo Cruz", position: "HOST" as const, hourlyRate: 16 },
      { name: "Luis Ortega", position: "DISHWASHER" as const, hourlyRate: 15 },
      { name: "Camila Vega", position: "PREP_COOK" as const, hourlyRate: 17 },
      { name: "Elena Soto", position: "KITCHEN_MANAGER" as const, hourlyRate: 28 },
    ].map((person) =>
      prisma.restaurantEmployee.create({
        data: { ...scope, ...person },
      }),
    ),
  );
  const staffByName = Object.fromEntries(roster.map((person) => [person.name, person]));
  const now = new Date();

  await prisma.staffShift.createMany({
    data: [
      {
        ...scope,
        employeeId: staffByName["Ana Ruiz"].id,
        employee: "Ana Ruiz",
        position: "SERVER",
        businessDate,
        scheduledStart: localTime("16:00"),
        scheduledEnd: localTime("23:00"),
        clockedIn: localTime("16:04"),
      },
      {
        ...scope,
        employeeId: staffByName["Diego Morales"].id,
        employee: "Diego Morales",
        position: "COOK",
        businessDate,
        scheduledStart: localTime("15:00"),
        scheduledEnd: localTime("23:00"),
        clockedIn: localTime("14:52"),
      },
      {
        ...scope,
        employeeId: staffByName["Sofia Herrera"].id,
        employee: "Sofia Herrera",
        position: "BARTENDER",
        businessDate,
        scheduledStart: localTime("16:00"),
        scheduledEnd: localTime("00:00", nextBusiness),
        clockedIn: localTime("16:12"),
        late: true,
        breakStatus: "ON_BREAK",
      },
      {
        ...scope,
        employeeId: staffByName["Mateo Cruz"].id,
        employee: "Mateo Cruz",
        position: "HOST",
        businessDate,
        scheduledStart: localTime("16:00"),
        scheduledEnd: localTime("23:00"),
        late: true,
      },
      {
        ...scope,
        employeeId: staffByName["Luis Ortega"].id,
        employee: "Luis Ortega",
        position: "DISHWASHER",
        businessDate,
        scheduledStart: localTime("15:00"),
        scheduledEnd: localTime("23:00"),
        callout: true,
      },
      {
        ...scope,
        employeeId: staffByName["Camila Vega"].id,
        employee: "Camila Vega",
        position: "PREP_COOK",
        businessDate,
        scheduledStart: localTime("14:00"),
        scheduledEnd: localTime("22:00"),
        clockedIn: localTime("13:55"),
      },
      {
        ...scope,
        employeeId: staffByName["Elena Soto"].id,
        employee: "Elena Soto",
        position: "KITCHEN_MANAGER",
        businessDate,
        scheduledStart: localTime("14:00"),
        scheduledEnd: localTime("23:00"),
        clockedIn: localTime("13:58"),
        clockedOut: now.getTime() > localTime("23:00").getTime() ? localTime("23:00") : null,
      },
    ],
  });

  const openingKitchen = await prisma.taskTemplate.create({
    data: {
      ...scope,
      name: "Opening Kitchen Checklist",
      description: "Start-of-day kitchen checks before service.",
      taskType: "OPENING",
      department: "KITCHEN",
      assignedRole: "COOK",
      priority: "HIGH",
      dueTime: "10:00",
      items: {
        create: [
          { title: "Turn equipment on", sortOrder: 0, assignedRole: "COOK" },
          { title: "Check walk-in temperature", sortOrder: 1, assignedRole: "COOK" },
          { title: "Check freezer temperature", sortOrder: 2, assignedRole: "COOK" },
          { title: "Verify prep list", sortOrder: 3, assignedRole: "PREP_COOK" },
          { title: "Verify inventory shortages", sortOrder: 4, assignedRole: "KITCHEN_MANAGER" },
          { title: "Check 86 items", sortOrder: 5, assignedRole: "KITCHEN_MANAGER" },
        ],
      },
    },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  const templateRunId = `seed_opening_${businessDate.toISOString().slice(0, 10)}`;
  await prisma.task.createMany({
    data: [
      ...openingKitchen.items.map((item, index) => ({
        ...scope,
        title: item.title,
        taskType: "OPENING" as const,
        department: "KITCHEN" as const,
        assignedEmployeeId: item.assignedRole === "KITCHEN_MANAGER" ? staffByName["Elena Soto"].id : staffByName["Diego Morales"].id,
        assignedRole: item.assignedRole,
        dueAt: localTime("10:00"),
        priority: "HIGH" as const,
        status: index < 3 ? ("DONE" as const) : ("OPEN" as const),
        createdById: actorId,
        completedById: index < 3 ? actorId : null,
        completedAt: index < 3 ? localTime("09:40") : null,
        verifiedById: index === 0 ? actorId : null,
        verifiedAt: index === 0 ? localTime("09:50") : null,
        templateId: openingKitchen.id,
        templateRunId,
        businessDate,
      })),
      {
        ...scope,
        title: "Fire tortillas for the 8pm rush",
        description: "Par-cook and hold for dinner service.",
        taskType: "PREP",
        department: "KITCHEN",
        assignedEmployeeId: staffByName["Camila Vega"].id,
        assignedRole: "PREP_COOK",
        dueAt: localTime("20:00"),
        priority: "NORMAL",
        status: "IN_PROGRESS",
        createdById: actorId,
        businessDate,
      },
      {
        ...scope,
        title: "Count liquor before close",
        taskType: "CLOSING",
        department: "BAR",
        assignedEmployeeId: staffByName["Sofia Herrera"].id,
        assignedRole: "BARTENDER",
        dueAt: localTime("23:00"),
        priority: "HIGH",
        createdById: actorId,
        businessDate,
      },
    ],
  });

  await prisma.managerLog.createMany({
    data: [
      {
        ...scope,
        businessDate: priorDay(1),
        category: "MAINTENANCE",
        priority: "HIGH",
        description: "Walk-in checked at 4:10. Still a degree high.",
        body: "Walk-in checked at 4:10. Still a degree high.",
        createdById: actorId,
      },
      {
        ...scope,
        businessDate: priorDay(1),
        category: "INVENTORY_SHORTAGE",
        priority: "URGENT",
        description: "Avocado case shorted by the produce vendor. 86 guacamole if we run out.",
        body: "Avocado case shorted by the produce vendor. 86 guacamole if we run out.",
        createdById: actorId,
      },
      {
        ...scope,
        businessDate: priorDay(1),
        category: "STAFFING",
        priority: "NORMAL",
        description: "Luis called out of dish. Expo covered until 9.",
        body: "Luis called out of dish. Expo covered until 9.",
        createdById: actorId,
        resolved: true,
        resolvedById: actorId,
        resolvedAt: localTime("22:10", priorDay(1)),
      },
      {
        ...scope,
        businessDate,
        category: "INVENTORY_SHORTAGE",
        priority: "HIGH",
        description: "86 branzino after the 7pm rush.",
        body: "86 branzino after the 7pm rush.",
        createdById: actorId,
      },
      {
        ...scope,
        businessDate,
        category: "CUSTOMER_COMPLAINT",
        priority: "NORMAL",
        description: "Table 12 allergy note was missed on first pass. Comp'd dessert, guest stayed.",
        body: "Table 12 allergy note was missed on first pass. Comp'd dessert, guest stayed.",
        createdById: actorId,
        resolved: true,
        resolvedById: actorId,
        resolvedAt: localTime("20:15"),
      },
      {
        ...scope,
        businessDate,
        category: "CASH",
        priority: "HIGH",
        description: "Bar till was $18 short at shift change. Recount before close.",
        body: "Bar till was $18 short at shift change. Recount before close.",
        createdById: actorId,
      },
    ],
  });

  console.log(`Citlatli live board seeded for ${businessDate.toISOString().slice(0, 10)}`);
}

async function seedSisterRestaurants(companyId: string, createdById?: string) {
  const timezone = "America/New_York";
  const businessDate = businessDateFor(timezone);
  const houses = [
    {
      id: "loc_short_pump",
      slug: "short-pump",
      name: "Short Pump",
      city: "Short Pump",
      sales: 18420,
      goal: 18059,
      labor: 4126,
      waste: 142,
      eightySix: ["Branzino"],
    },
    {
      id: "loc_midlothian",
      slug: "midlothian",
      name: "Midlothian",
      city: "Midlothian",
      sales: 16200,
      goal: 17802,
      labor: 4568,
      waste: 387,
      eightySix: ["Branzino", "Duck carnitas", "House-made pasta", "Chile en nogada"],
    },
    {
      id: "loc_richmond",
      slug: "richmond",
      name: "Richmond",
      city: "Richmond",
      sales: 21100,
      goal: 19537,
      labor: 4600,
      waste: 98,
      eightySix: [] as string[],
    },
  ];

  for (const house of houses) {
    const restaurant = await prisma.location.upsert({
      where: { companyId_slug: { companyId, slug: house.slug } },
      update: { name: house.name, timezone, city: house.city, state: "VA", country: "US" },
      create: {
        id: house.id,
        companyId,
        name: house.name,
        slug: house.slug,
        timezone,
        city: house.city,
        state: "VA",
        country: "US",
      },
    });
    const scope = { companyId, locationId: restaurant.id };

    await prisma.$transaction([
      prisma.dailyOperations.deleteMany({ where: scope }),
      prisma.menuItemStatus.deleteMany({ where: scope }),
      prisma.menuItem.deleteMany({ where: scope }),
      prisma.wasteEntry.deleteMany({ where: scope }),
    ]);

    await prisma.dailyOperations.create({
      data: {
        ...scope,
        businessDate,
        salesAmount: house.sales,
        netSales: house.sales,
        grossSales: house.sales,
        salesGoal: house.goal,
        laborCost: house.labor,
      },
    });

    if (house.waste > 0) {
      await prisma.wasteEntry.create({
        data: {
          ...scope,
          businessDate,
          itemName: "Prep trim",
          quantity: 1,
          unit: "lot",
          unitCost: house.waste,
          totalCost: house.waste,
          reason: "PREP_WASTE",
          employeeId: createdById,
        },
      });
    }

    const actorId = createdById ?? (await prisma.user.findFirst({ select: { id: true } }))?.id;
    if (actorId) {
      for (const name of house.eightySix) {
        const item = await prisma.menuItem.create({
          data: { ...scope, name, category: "Plates" },
        });
        await prisma.menuItemStatus.create({
          data: {
            ...scope,
            menuItemId: item.id,
            status: "EIGHTY_SIXED",
            remainingQuantity: 0,
            createdById: actorId,
          },
        });
      }
    }
  }

  console.log("Company houses seeded: Short Pump, Midlothian, Richmond");
}

async function seedBarceloGroup(createdById?: string) {
  const companies = await prisma.company.findMany({
    where: {
      OR: [
        { id: BARCELO_COMPANY_ID },
        { slug: { startsWith: "barcelo" } },
        { name: { contains: "Barcelo", mode: "insensitive" } },
      ],
    },
    include: { locations: true },
    orderBy: { createdAt: "asc" },
  });
  const company =
    companies.find((item) => item.id !== BARCELO_COMPANY_ID) ??
    companies[0] ??
    (await prisma.company.create({
      data: {
        id: BARCELO_COMPANY_ID,
        name: "Barcelo Restaurant Group",
        slug: "barcelo",
      },
      include: { locations: true },
    }));

  const existingHouse = company.locations.find(
    (location) => location.name.toLowerCase() === "catalunia" || location.slug.startsWith("catalunia"),
  );
  const restaurant = existingHouse
    ? await prisma.location.update({
        where: { id: existingHouse.id },
        data: {
          name: "Catalunia",
          timezone: BARCELO_TIMEZONE,
          city: existingHouse.city ?? "Barcelona",
          state: existingHouse.state ?? "Catalunya",
          country: existingHouse.country || "ES",
        },
      })
    : await prisma.location.create({
        data: {
          ...(company.id === BARCELO_COMPANY_ID ? { id: CATALUNIA_LOCATION_ID } : {}),
          companyId: company.id,
          name: "Catalunia",
          slug: "catalunia",
          timezone: BARCELO_TIMEZONE,
          city: "Barcelona",
          state: "Catalunya",
          country: "ES",
        },
      });

  for (const extra of companies.filter((item) => item.id !== company.id)) {
    await prisma.company.delete({ where: { id: extra.id } });
  }

  const scope = { companyId: company.id, locationId: restaurant.id };
  const businessDate = businessDateFor(BARCELO_TIMEZONE);
  const demoPassword = process.env.SUPER_ADMIN_PASSWORD ?? "change-me";
  const passwordHash = await bcrypt.hash(demoPassword, 12);

  await prisma.$transaction([
    prisma.dailyOperations.deleteMany({ where: scope }),
    prisma.salesGoal.deleteMany({ where: scope }),
    prisma.menuItemStatus.deleteMany({ where: scope }),
    prisma.menuItem.deleteMany({ where: scope }),
    prisma.inventoryAdjustment.deleteMany({ where: scope }),
    prisma.inventoryItem.deleteMany({ where: scope }),
    prisma.wasteEntry.deleteMany({ where: scope }),
    prisma.managerIssue.deleteMany({ where: scope }),
    prisma.task.deleteMany({ where: scope }),
    prisma.taskTemplate.deleteMany({ where: scope }),
    prisma.workingEmployee.deleteMany({ where: scope }),
    prisma.staffShift.deleteMany({ where: scope }),
    prisma.restaurantEmployee.deleteMany({ where: scope }),
    prisma.managerLog.deleteMany({ where: scope }),
  ]);

  const team = [
    {
      email: "nora@barcelo.group",
      firstName: "Nora",
      lastName: "Barcelo",
      companyRole: "COMPANY_ADMIN" as const,
    },
    {
      email: "pau@catalunia.barcelo",
      firstName: "Pau",
      lastName: "Serra",
      locationRole: "GENERAL_MANAGER" as const,
    },
    {
      email: "ines@catalunia.barcelo",
      firstName: "Ines",
      lastName: "Costa",
      locationRole: "KITCHEN_MANAGER" as const,
    },
    {
      email: "marta@catalunia.barcelo",
      firstName: "Marta",
      lastName: "Valls",
      locationRole: "EMPLOYEE" as const,
    },
  ];

  for (const member of team) {
    const user = await prisma.user.upsert({
      where: { email: member.email },
      update: { passwordHash, firstName: member.firstName, lastName: member.lastName, emailVerifiedAt: new Date() },
      create: {
        email: member.email,
        passwordHash,
        firstName: member.firstName,
        lastName: member.lastName,
        emailVerifiedAt: new Date(),
      },
    });
    if (member.companyRole) {
      await prisma.companyMembership.upsert({
        where: { userId_companyId: { userId: user.id, companyId: company.id } },
        update: { role: member.companyRole, status: "ACTIVE" },
        create: { userId: user.id, companyId: company.id, role: member.companyRole, status: "ACTIVE" },
      });
    }
    if (member.locationRole) {
      await prisma.locationMembership.upsert({
        where: { userId_locationId: { userId: user.id, locationId: restaurant.id } },
        update: { role: member.locationRole, status: "ACTIVE" },
        create: { userId: user.id, locationId: restaurant.id, role: member.locationRole, status: "ACTIVE" },
      });
    }
  }

  const actorId = createdById ?? (await prisma.user.findFirst({ select: { id: true } }))?.id;
  const priorDay = (offset: number) => {
    const next = new Date(businessDate);
    next.setUTCDate(next.getUTCDate() - offset);
    return next;
  };
  const weekStartDate = (() => {
    const weekday = businessDate.getUTCDay();
    const offset = weekday === 0 ? 6 : weekday - 1;
    return priorDay(offset);
  })();
  const monthStartDate = new Date(Date.UTC(businessDate.getUTCFullYear(), businessDate.getUTCMonth(), 1));
  const nextBusiness = new Date(businessDate);
  nextBusiness.setUTCDate(nextBusiness.getUTCDate() + 1);
  const localTime = (time: string, day = businessDate) =>
    new Date(`${day.toISOString().slice(0, 10)}T${time}:00+02:00`);

  await prisma.dailyOperations.create({
    data: {
      ...scope,
      businessDate,
      salesAmount: 17640,
      netSales: 17640,
      grossSales: 18920,
      salesGoal: 16800,
      covers: 92,
      laborCost: 3890,
      foodSales: 12110,
      alcoholSales: 4630,
      otherSales: 900,
      discounts: 280,
      comps: 140,
      voids: 90,
      tax: 3120,
      orderCount: 78,
    },
  });
  await prisma.salesGoal.createMany({
    data: [
      { ...scope, period: "DAILY", periodStart: businessDate, amount: 16800 },
      { ...scope, period: "WEEKLY", periodStart: weekStartDate, amount: 112000 },
      { ...scope, period: "MONTHLY", periodStart: monthStartDate, amount: 460000 },
    ],
  });

  const menu = await Promise.all(
    [
      { name: "Pulpo a la gallega", category: "Plates" },
      { name: "Paella de marisco", category: "Plates" },
      { name: "Fideua", category: "Plates" },
      { name: "Escalivada", category: "Plates" },
      { name: "Pan con tomate", category: "Starters" },
      { name: "Croquetas", category: "Starters" },
      { name: "Boquerones", category: "Starters" },
      { name: "Cava brut", category: "Drinks" },
      { name: "Vermut de grifo", category: "Drinks" },
      { name: "Crema catalana", category: "Desserts" },
    ].map((item) => prisma.menuItem.create({ data: { ...scope, ...item } })),
  );
  const byName = Object.fromEntries(menu.map((item) => [item.name, item]));

  if (actorId) {
    await prisma.menuItemStatus.createMany({
      data: [
        {
          ...scope,
          menuItemId: byName["Pulpo a la gallega"].id,
          status: "EIGHTY_SIXED",
          remainingQuantity: 0,
          reason: "Octopus ran out after lunch",
          createdById: actorId,
        },
        {
          ...scope,
          menuItemId: byName["Paella de marisco"].id,
          status: "LOW_STOCK",
          remainingQuantity: 3,
          reason: "Holding last pans for dinner",
          createdById: actorId,
        },
        {
          ...scope,
          menuItemId: byName["Cava brut"].id,
          status: "LOW_STOCK",
          remainingQuantity: 4,
          reason: "Weekend pours",
          createdById: actorId,
        },
      ],
    });
  }

  const inventory = await Promise.all(
    [
      {
        name: "Octopus",
        category: "SEAFOOD" as const,
        sku: "SEA-OCT",
        unit: "kg",
        quantityOnHand: 0,
        parLevel: 8,
        reorderLevel: 3,
        unitCost: 22,
        supplier: "Peixateria Barceloneta",
      },
      {
        name: "Bomba rice",
        category: "DRY_GOODS" as const,
        sku: "DRY-BOM",
        unit: "kg",
        quantityOnHand: 6,
        parLevel: 12,
        reorderLevel: 8,
        unitCost: 4.2,
        supplier: "Molinos del Ebro",
      },
      {
        name: "Tomatoes",
        category: "PRODUCE" as const,
        sku: "PRD-TOM",
        unit: "kg",
        quantityOnHand: 5,
        parLevel: 14,
        reorderLevel: 8,
        unitCost: 1.8,
        supplier: "Mercabarna",
      },
      {
        name: "Olive oil",
        category: "DRY_GOODS" as const,
        sku: "DRY-OIL",
        unit: "L",
        quantityOnHand: 9,
        parLevel: 10,
        reorderLevel: 4,
        unitCost: 7.5,
        supplier: "Priorat Olis",
      },
      {
        name: "Cava",
        category: "ALCOHOL" as const,
        sku: "ALC-CAV",
        unit: "btl",
        quantityOnHand: 4,
        parLevel: 18,
        reorderLevel: 8,
        unitCost: 11,
        supplier: "Cavas Recaredo",
      },
      {
        name: "Squid",
        category: "SEAFOOD" as const,
        sku: "SEA-SQD",
        unit: "kg",
        quantityOnHand: 3,
        parLevel: 7,
        reorderLevel: 4,
        unitCost: 16,
        supplier: "Peixateria Barceloneta",
      },
      {
        name: "Almonds",
        category: "DRY_GOODS" as const,
        sku: "DRY-ALM",
        unit: "kg",
        quantityOnHand: 2,
        parLevel: 4,
        reorderLevel: 2,
        unitCost: 8,
        supplier: "Mercabarna",
      },
      {
        name: "Bar napkins",
        category: "PAPER_GOODS" as const,
        sku: "PAP-NAP",
        unit: "case",
        quantityOnHand: 1,
        parLevel: 3,
        reorderLevel: 2,
        unitCost: 18,
        supplier: "Hosteleria BCN",
      },
    ].map((item) => prisma.inventoryItem.create({ data: { ...scope, ...item } })),
  );
  const inv = Object.fromEntries(inventory.map((item) => [item.name, item]));

  if (actorId) {
    await prisma.inventoryAdjustment.createMany({
      data: inventory.map((item) => ({
        ...scope,
        inventoryItemId: item.id,
        type: "CREATE" as const,
        quantityBefore: 0,
        quantityAfter: Number(item.quantityOnHand),
        quantityDelta: Number(item.quantityOnHand),
        reason: "Opening count",
        createdById: actorId,
      })),
    });
    await prisma.wasteEntry.createMany({
      data: [
        {
          ...scope,
          inventoryItemId: inv.Octopus.id,
          businessDate,
          itemName: "Octopus",
          quantity: 1,
          unit: "kg",
          unitCost: 22,
          totalCost: 22,
          reason: "SPOILAGE",
          employeeId: actorId,
          shift: "LUNCH",
          notes: "Last tray did not hold",
        },
        {
          ...scope,
          inventoryItemId: inv.Tomatoes.id,
          businessDate,
          itemName: "Tomatoes",
          quantity: 2,
          unit: "kg",
          unitCost: 1.8,
          totalCost: 3.6,
          reason: "PREP_WASTE",
          employeeId: actorId,
          shift: "LUNCH",
        },
        {
          ...scope,
          inventoryItemId: inv.Cava.id,
          businessDate: priorDay(1),
          itemName: "Cava",
          quantity: 1,
          unit: "btl",
          unitCost: 11,
          totalCost: 11,
          reason: "DROPPED",
          employeeId: actorId,
          shift: "DINNER",
        },
      ],
    });
  }

  await prisma.managerIssue.createMany({
    data: [
      { ...scope, title: "Terrace heaters need gas" },
      { ...scope, title: "Allergy note on table 7" },
    ],
  });

  const roster = await Promise.all(
    [
      { name: "Marta Valls", position: "SERVER" as const, hourlyRate: 16 },
      { name: "Jordi Puig", position: "COOK" as const, hourlyRate: 21 },
      { name: "Laia Roca", position: "BARTENDER" as const, hourlyRate: 19 },
      { name: "Nil Ferrer", position: "HOST" as const, hourlyRate: 15 },
      { name: "Joan Soler", position: "DISHWASHER" as const, hourlyRate: 14 },
      { name: "Clara Pujol", position: "PREP_COOK" as const, hourlyRate: 16 },
      { name: "Ines Costa", position: "KITCHEN_MANAGER" as const, hourlyRate: 26 },
    ].map((person) => prisma.restaurantEmployee.create({ data: { ...scope, ...person } })),
  );
  const staffByName = Object.fromEntries(roster.map((person) => [person.name, person]));

  await prisma.staffShift.createMany({
    data: [
      {
        ...scope,
        employeeId: staffByName["Marta Valls"].id,
        employee: "Marta Valls",
        position: "SERVER",
        businessDate,
        scheduledStart: localTime("12:00"),
        scheduledEnd: localTime("16:00"),
        clockedIn: localTime("11:55"),
      },
      {
        ...scope,
        employeeId: staffByName["Jordi Puig"].id,
        employee: "Jordi Puig",
        position: "COOK",
        businessDate,
        scheduledStart: localTime("11:00"),
        scheduledEnd: localTime("23:00"),
        clockedIn: localTime("10:50"),
      },
      {
        ...scope,
        employeeId: staffByName["Laia Roca"].id,
        employee: "Laia Roca",
        position: "BARTENDER",
        businessDate,
        scheduledStart: localTime("12:00"),
        scheduledEnd: localTime("00:00", nextBusiness),
        clockedIn: localTime("12:08"),
        late: true,
      },
      {
        ...scope,
        employeeId: staffByName["Nil Ferrer"].id,
        employee: "Nil Ferrer",
        position: "HOST",
        businessDate,
        scheduledStart: localTime("12:00"),
        scheduledEnd: localTime("16:00"),
        clockedIn: localTime("11:58"),
      },
      {
        ...scope,
        employeeId: staffByName["Joan Soler"].id,
        employee: "Joan Soler",
        position: "DISHWASHER",
        businessDate,
        scheduledStart: localTime("11:00"),
        scheduledEnd: localTime("23:00"),
        callout: true,
      },
      {
        ...scope,
        employeeId: staffByName["Clara Pujol"].id,
        employee: "Clara Pujol",
        position: "PREP_COOK",
        businessDate,
        scheduledStart: localTime("10:00"),
        scheduledEnd: localTime("18:00"),
        clockedIn: localTime("09:50"),
      },
      {
        ...scope,
        employeeId: staffByName["Ines Costa"].id,
        employee: "Ines Costa",
        position: "KITCHEN_MANAGER",
        businessDate,
        scheduledStart: localTime("10:00"),
        scheduledEnd: localTime("23:00"),
        clockedIn: localTime("09:48"),
      },
    ],
  });

  const openingKitchen = await prisma.taskTemplate.create({
    data: {
      ...scope,
      name: "Opening Kitchen Checklist",
      description: "Start-of-day kitchen checks before service.",
      taskType: "OPENING",
      department: "KITCHEN",
      assignedRole: "COOK",
      priority: "HIGH",
      dueTime: "10:00",
      items: {
        create: [
          { title: "Light the plancha", sortOrder: 0, assignedRole: "COOK" },
          { title: "Check walk-in temperature", sortOrder: 1, assignedRole: "COOK" },
          { title: "Verify paella mise", sortOrder: 2, assignedRole: "PREP_COOK" },
          { title: "Check 86 items", sortOrder: 3, assignedRole: "KITCHEN_MANAGER" },
        ],
      },
    },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  const templateRunId = `seed_catalunia_${businessDate.toISOString().slice(0, 10)}`;
  await prisma.task.createMany({
    data: [
      ...openingKitchen.items.map((item, index) => ({
        ...scope,
        title: item.title,
        taskType: "OPENING" as const,
        department: "KITCHEN" as const,
        assignedEmployeeId:
          item.assignedRole === "KITCHEN_MANAGER" ? staffByName["Ines Costa"].id : staffByName["Jordi Puig"].id,
        assignedRole: item.assignedRole,
        dueAt: localTime("10:00"),
        priority: "HIGH" as const,
        status: index < 2 ? ("DONE" as const) : ("OPEN" as const),
        createdById: actorId,
        completedById: index < 2 ? actorId : null,
        completedAt: index < 2 ? localTime("09:40") : null,
        templateId: openingKitchen.id,
        templateRunId,
        businessDate,
      })),
      {
        ...scope,
        title: "Finish fideua sofrito",
        taskType: "PREP",
        department: "KITCHEN",
        assignedEmployeeId: staffByName["Clara Pujol"].id,
        assignedRole: "PREP_COOK",
        dueAt: localTime("13:00"),
        priority: "NORMAL",
        status: "IN_PROGRESS",
        createdById: actorId,
        businessDate,
      },
    ],
  });

  if (actorId) {
    await prisma.managerLog.createMany({
      data: [
        {
          ...scope,
          businessDate,
          category: "INVENTORY_SHORTAGE",
          priority: "HIGH",
          description: "86 pulpo after the lunch rush.",
          body: "86 pulpo after the lunch rush.",
          createdById: actorId,
        },
        {
          ...scope,
          businessDate,
          category: "STAFFING",
          priority: "NORMAL",
          description: "Joan called out of dish. Expo covering until 4.",
          body: "Joan called out of dish. Expo covering until 4.",
          createdById: actorId,
        },
      ],
    });
  }

  console.log("Barcelo Restaurant Group seeded with Catalunia team, menu, and inventory");
  return company.id;
}

function catalogPricesFromEnv() {
  const pattern = /^BILLING_PRICE_([A-Z0-9]+)_((MONTHLY|ANNUAL))$/;
  const prices: { code: string; interval: "MONTHLY" | "ANNUAL"; amount: number }[] = [];

  for (const [key, raw] of Object.entries(process.env)) {
    const match = key.match(pattern);
    if (!match || raw == null || raw.trim() === "") {
      continue;
    }
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error(`${key} must be a non-negative number`);
    }
    prices.push({ code: match[1], interval: match[2] as "MONTHLY" | "ANNUAL", amount });
  }

  return prices;
}

function planFeaturesFromEnv(code: string) {
  const raw = process.env[`BILLING_PLAN_${code}_FEATURES`];
  if (!raw?.trim()) {
    return [];
  }
  return raw
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function seedBillingCatalog() {
  const currency = process.env.BILLING_CURRENCY?.trim().toUpperCase() || "USD";
  const prices = catalogPricesFromEnv();
  if (prices.length === 0) {
    console.log("Skipping billing catalog. Set BILLING_PRICE_<PLAN>_<MONTHLY|ANNUAL> to load per-location prices.");
    return;
  }

  const codes = [...new Set(prices.map((price) => price.code))];
  for (const [index, code] of codes.entries()) {
    const name = process.env[`BILLING_PLAN_${code}_NAME`]?.trim() || code.charAt(0) + code.slice(1).toLowerCase();
    const description = process.env[`BILLING_PLAN_${code}_DESCRIPTION`]?.trim() || `Per-location ${name} plan`;
    const features = planFeaturesFromEnv(code);
    const sortOrderRaw = Number(process.env[`BILLING_PLAN_${code}_ORDER`]);
    const sortOrder = Number.isFinite(sortOrderRaw) ? sortOrderRaw : index;
    await prisma.billingPlan.upsert({
      where: { code: code.toLowerCase() },
      update: { name, description, sortOrder, active: true, ...(features.length ? { features } : {}) },
      create: { code: code.toLowerCase(), name, description, features, sortOrder, active: true },
    });
  }

  for (const price of prices) {
    const plan = await prisma.billingPlan.findUniqueOrThrow({ where: { code: price.code.toLowerCase() } });
    await prisma.billingPrice.upsert({
      where: {
        planId_interval_currency: {
          planId: plan.id,
          interval: price.interval,
          currency,
        },
      },
      update: { amountPerLocation: price.amount, active: true },
      create: {
        planId: plan.id,
        interval: price.interval,
        currency,
        amountPerLocation: price.amount,
        active: true,
      },
    });
  }

  console.log(`Billing catalog ready: ${codes.join(", ")} (${currency}, per location)`);
}

async function seedCompanyTrial(companyId: string, createdById?: string) {
  const houses = await prisma.location.count({ where: { companyId } });
  const existing = await prisma.companySubscription.findUnique({ where: { companyId } });
  if (existing) {
    if (houses > existing.locationQuantity) {
      await prisma.companySubscription.update({
        where: { companyId },
        data: { locationQuantity: houses },
      });
      console.log(`Company trial quantity raised to ${houses} locations`);
    }
    return;
  }

  const price = await prisma.billingPrice.findFirst({
    where: { active: true, plan: { active: true } },
    include: { plan: true },
    orderBy: [{ plan: { sortOrder: "asc" } }, { interval: "asc" }],
  });
  if (!price) {
    console.log("Skipping company trial. No billing prices loaded.");
    return;
  }

  const now = new Date();
  const trialDaysRaw = Number(process.env.BILLING_TRIAL_DAYS);
  const trialDays = Number.isFinite(trialDaysRaw) && trialDaysRaw > 0 ? trialDaysRaw : 14;
  const trialEndsAt = new Date(now.getTime() + trialDays * 86_400_000);
  const subscription = await prisma.companySubscription.create({
    data: {
      companyId,
      planId: price.planId,
      priceId: price.id,
      status: "TRIAL",
      locationQuantity: Math.max(houses, 1),
      trialEndsAt,
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt,
    },
  });
  await prisma.subscriptionChange.create({
    data: {
      companyId,
      subscriptionId: subscription.id,
      type: "CREATED",
      newValue: {
        status: "TRIAL",
        planCode: price.plan.code,
        interval: price.interval,
        locationQuantity: subscription.locationQuantity,
      },
      createdById: createdById ?? null,
    },
  });
  console.log(`Company trial started: ${companyId} (${subscription.locationQuantity} locations)`);
}

async function seedDemoAccount() {
  const email = process.env.DEMO_EMAIL?.trim().toLowerCase() || "demo@liveshift.app";
  const password = process.env.DEMO_PASSWORD || "liveshift-demo";
  const company = await prisma.company.findUnique({ where: { slug: "citlatli" } });
  if (!company) {
    console.log("Skipping demo account. Citlatli is not seeded.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      firstName: "Demo",
      lastName: "Host",
      platformRole: null,
      emailVerifiedAt: new Date(),
    },
    create: {
      email,
      passwordHash,
      firstName: "Demo",
      lastName: "Host",
      platformRole: null,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.companyMembership.upsert({
    where: { userId_companyId: { userId: user.id, companyId: company.id } },
    update: { role: "COMPANY_ADMIN", status: "ACTIVE" },
    create: { userId: user.id, companyId: company.id, role: "COMPANY_ADMIN", status: "ACTIVE" },
  });

  console.log(`Client demo ready: ${email} (Citlatli company admin)`);
}

async function main() {
  const admin = await seedSuperAdmin();
  await seedBillingCatalog();
  await seedCitlatli(admin?.id);
  await seedSisterRestaurants(CITLATLI_COMPANY_ID, admin?.id);
  await seedCompanyTrial(CITLATLI_COMPANY_ID, admin?.id);
  await seedDemoAccount();
  const barceloId = await seedBarceloGroup(admin?.id);
  await seedCompanyTrial(barceloId, admin?.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
