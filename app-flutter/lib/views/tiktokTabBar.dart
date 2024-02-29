import 'package:meditree/style/style.dart';
import 'package:meditree/views/selectText.dart';
import 'package:flutter/material.dart';

enum TikTokPageTag {
  home,
  follow,
  msg,
  me,
}

class TikTokTabBar extends StatelessWidget {
  final Function(TikTokPageTag)? onTabSwitch;
  final Function()? onAddButton;

  final bool hasBackground;
  final TikTokPageTag? current;

  const TikTokTabBar({
    super.key,
    this.onTabSwitch,
    this.current,
    this.onAddButton,
    this.hasBackground = false,
  });

  @override
  Widget build(BuildContext context) {
    return BottomNavigationBar(
      items: [
        BottomNavigationBarItem(icon: Icon(Icons.home), label: "Home"),
        BottomNavigationBarItem(icon: Icon(Icons.message), label: "Message"),
        BottomNavigationBarItem(icon: Icon(Icons.person), label: "Me"),
      ],
      onTap: (i){
        switch(i){
          case 0: onTabSwitch?.call(TikTokPageTag.home);
          case 1: onTabSwitch?.call(TikTokPageTag.msg);
          case 2: onTabSwitch?.call(TikTokPageTag.me);
        }
      },
    );
  }
}
