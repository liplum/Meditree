import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';

class SysSize {
  static const double avatar = 56;
  // static const double iconBig = 40;
  static const double iconNormal = 24;
  // static const double big = 18;
  // static const double normal = 16;
  // static const double small = 12;
  static const double iconBig = 40;
  static const double big = 16;
  static const double normal = 14;
  static const double small = 12;
}

class StandardTextStyle {
  static const TextStyle big = TextStyle(
    fontWeight: FontWeight.w600,
    fontSize: SysSize.big,
    inherit: true,
  );
  static const TextStyle bigWithOpacity = TextStyle(
    color: Color.fromRGBO(0xff, 0xff, 0xff, .66),
    fontWeight: FontWeight.w600,
    fontSize: SysSize.big,
    inherit: true,
  );
  static const TextStyle normalW = TextStyle(
    fontWeight: FontWeight.w600,
    fontSize: SysSize.normal,
    inherit: true,
  );
  static const TextStyle normal = TextStyle(
    fontWeight: FontWeight.normal,
    fontSize: SysSize.normal,
    inherit: true,
  );
  static const TextStyle normalWithOpacity = TextStyle(
    color: Color.fromRGBO(0xff, 0xff, 0xff, .66),
    fontWeight: FontWeight.normal,
    fontSize: SysSize.normal,
    inherit: true,
  );
  static const TextStyle small = TextStyle(
    fontWeight: FontWeight.normal,
    fontSize: SysSize.small,
    inherit: true,
  );
  static const TextStyle smallWithOpacity = TextStyle(
    color: Color.fromRGBO(0xff, 0xff, 0xff, .66),
    fontWeight: FontWeight.normal,
    fontSize: SysSize.small,
    inherit: true,
  );
}

class ColorPlate {
  // 配色
  static const Color orange = Color(0xffFFC459);
  static const Color yellow = Color(0xffF1E300);
  static const Color green = Color(0xff7ED321);
  static const Color red = Color(0xffEB3838);
  static const Color darkGray = Color(0xff4A4A4A);
  static const Color gray = Color(0xff9b9b9b);
  static const Color lightGray = Color(0xfff5f5f4);
  static const Color black = Color(0xff000000);
  static const Color white = Color(0xffffffff);
  static const Color clear = Color(0);

  /// 深色背景
  static const Color back1 = Color(0xff1D1F22);

  /// 比深色背景略深一点
  static const Color back2 = Color(0xff121314);
}
