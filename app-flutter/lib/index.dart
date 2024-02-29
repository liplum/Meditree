import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:rettulf/rettulf.dart';

class MainStagePage extends StatefulWidget {
  final StatefulNavigationShell navigationShell;

  const MainStagePage({super.key, required this.navigationShell});

  @override
  State<MainStagePage> createState() => _MainStagePageState();
}

typedef _NavigationDest = ({Widget icon, Widget activeIcon, String label});

extension _NavigationDestX on _NavigationDest {
  BottomNavigationBarItem toBarItem() {
    return BottomNavigationBarItem(icon: icon, activeIcon: activeIcon, label: label);
  }

  NavigationRailDestination toRailDest() {
    return NavigationRailDestination(icon: icon, selectedIcon: activeIcon, label: label.text());
  }
}

class _MainStagePageState extends State<MainStagePage> {
  var currentStage = 0;
  late var items = buildItems();

  List<({String route, ({Widget icon, Widget activeIcon, String label}) item})> buildItems() {
    return [
      (
        route: "/home",
        item: (
          icon: const Icon(Icons.home_outlined),
          activeIcon: const Icon(Icons.home),
          label: "Home",
        )
      ),
      (
        route: "/explorer",
        item: (
          icon: const Icon(Icons.folder_outlined),
          activeIcon: const Icon(Icons.folder),
          label: "Explorer",
        )
      ),
      (
        route: "/me",
        item: (
          icon: const Icon(Icons.person_outline),
          activeIcon: const Icon(Icons.person),
          label: "Me",
        )
      ),
    ];
  }

  @override
  void didChangeDependencies() {
    items = buildItems();
    super.didChangeDependencies();
  }

  @override
  Widget build(BuildContext context) {
    if (context.isPortrait) {
      return Scaffold(
        body: widget.navigationShell,
        bottomNavigationBar: buildButtonNavigationBar(),
      );
    } else {
      return Scaffold(
        body: [
          buildNavigationRail(),
          const VerticalDivider(),
          widget.navigationShell.expanded(),
        ].row(),
      );
    }
  }

  Widget buildButtonNavigationBar() {
    return BottomNavigationBar(
      useLegacyColorScheme: false,
      showUnselectedLabels: false,
      enableFeedback: true,
      type: BottomNavigationBarType.fixed,
      landscapeLayout: BottomNavigationBarLandscapeLayout.centered,
      currentIndex: getSelectedIndex(),
      onTap: onItemTapped,
      items: items.map((e) => e.item.toBarItem()).toList(),
    );
  }

  Widget buildNavigationRail() {
    return NavigationRail(
      labelType: NavigationRailLabelType.all,
      selectedIndex: getSelectedIndex(),
      onDestinationSelected: onItemTapped,
      destinations: items.map((e) => e.item.toRailDest()).toList(),
    );
  }

  int getSelectedIndex() {
    final location = GoRouterState.of(context).uri.toString();
    return items.indexWhere((e) => location.startsWith(e.route));
  }

  void onItemTapped(int index) {
    widget.navigationShell.goBranch(
      index,
      initialLocation: index == widget.navigationShell.currentIndex,
    );
  }
}
