import 'package:flutter/material.dart';
import 'package:meditree/route.dart';

class MeditreeApp extends StatefulWidget {
  const MeditreeApp({super.key});

  @override
  State<MeditreeApp> createState() => _MeditreeAppState();
}

class _MeditreeAppState extends State<MeditreeApp> {
  final $routingConfig = ValueNotifier(buildRoutingConfig());
  late final router = buildRouter($routingConfig);

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Meditree',
      routerConfig: router,
      theme: ThemeData.dark(),
    );
  }
}
