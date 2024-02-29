import 'package:meditree/pages/homePage.dart';
import 'package:meditree/style/style.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

void main() {
  /// 自定义报错页面
  if (kReleaseMode) {
    ErrorWidget.builder = (FlutterErrorDetails flutterErrorDetails) {
      debugPrint(flutterErrorDetails.toString());
      return Material(
        child: Center(
            child: Text(
          "发生了没有处理的错误\n请通知开发者",
          textAlign: TextAlign.center,
        )),
      );
    };
  }
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Tiktok',
      theme: ThemeData(
        brightness: Brightness.dark,
        hintColor: Colors.white,
        primaryColor: ColorPlate.orange,
        scaffoldBackgroundColor: ColorPlate.back1,
        dialogBackgroundColor: ColorPlate.back2,
        textTheme: TextTheme(
          bodyLarge: StandardTextStyle.normal,
        ),
      ),
      home: HomePage(),
    );
  }
}
