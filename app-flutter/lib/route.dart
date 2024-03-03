import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import 'index.dart';
import 'home/page/index.dart';
import 'me/page/index.dart';

final $Key = GlobalKey<NavigatorState>();
final $HomeShellKey = GlobalKey<NavigatorState>();
final $ExplorerKey = GlobalKey<NavigatorState>();
final $MeShellKey = GlobalKey<NavigatorState>();

final _homeShellRoute = GoRoute(
  path: "/home",
// Timetable is the home page.
  builder: (ctx, state) => const HomePage(),
);
final _explorerShellRoute = GoRoute(
  path: "/explorer",
// Timetable is the home page.
  builder: (ctx, state) => const Placeholder(),
);
final _meShellRoute = GoRoute(
  path: "/me",
// Timetable is the home page.
  builder: (ctx, state) => const UserPage(isSelfPage: true),
);

RoutingConfig buildRoutingConfig() {
  return RoutingConfig(
    routes: [
      GoRoute(
        path: "/",
        redirect: (ctx, state) => "/home",
      ),
      StatefulShellRoute.indexedStack(
        builder: (ctx, state, navigationShell) {
          return MainStagePage(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            navigatorKey: $HomeShellKey,
            routes: [
              _homeShellRoute,
            ],
          ),
          StatefulShellBranch(
            navigatorKey: $ExplorerKey,
            routes: [
              _explorerShellRoute,
            ],
          ),
          StatefulShellBranch(
            navigatorKey: $MeShellKey,
            routes: [
              _meShellRoute,
            ],
          ),
        ],
      ),
    ],
  );
}

Widget _onError(BuildContext context, GoRouterState state) {
  return const Placeholder();
}

GoRouter buildRouter(ValueNotifier<RoutingConfig> $routingConfig) {
  return GoRouter.routingConfig(
    routingConfig: $routingConfig,
    navigatorKey: $Key,
    initialLocation: "/",
    debugLogDiagnostics: kDebugMode,
    errorBuilder: _onError,
  );
}