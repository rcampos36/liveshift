import { TaskBoard } from "@/components/app/task-board";
import { getLocationRole } from "@/lib/authorization/guards";
import { requireRestaurantPage } from "@/lib/authorization/page-access";
import { roleHasPermission } from "@/lib/authorization/permissions";
import { requireRestaurantOperations } from "@/lib/operations/scope";
import { getTaskSnapshot } from "@/lib/tasks/service";

export default async function TasksPage({
  params,
}: {
  params: Promise<{ companyId: string; locationId: string }>;
}) {
  const { companyId, locationId } = await params;
  const { user, company, restaurant } = await requireRestaurantPage(companyId, locationId);
  const { restaurant: house, scope } = await requireRestaurantOperations(companyId, locationId);
  const role = getLocationRole(user, locationId, companyId);

  return (
    <TaskBoard
      companyId={companyId}
      locationId={locationId}
      companyName={company.name}
      view="board"
      initial={await getTaskSnapshot(
        scope,
        restaurant.name,
        house.timezone,
        role ? roleHasPermission(role, "operations.write") : false,
        user.id,
      )}
    />
  );
}
