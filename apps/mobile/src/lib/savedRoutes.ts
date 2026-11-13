/**
 * "Your routes": the list of routes the rider drew or imported, with its detail sheet (ride, share as a link, export GPX, delete)
 * and the saved-routes picker on a trip day. Parked, not removed: riders should not keep riding the same routes, so the idea is
 * hidden until it proves needed. Turn this on to bring it all back; delete the code only when it is clearly not coming back.
 * Where it lives: app/plan.tsx (list and sheet), features/trip/TripDayFields.tsx (picker), store/myRoutes.ts. See docs/todo.md.
 */
export const SHOW_SAVED_ROUTES = false;
