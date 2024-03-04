import 'dart:async';

import 'package:flutter/material.dart';

import 'favorite.dart';

/// 视频手势封装
/// 单击：暂停
/// 双击：点赞，双击后再次单击也是增加点赞爱心
class TikTokVideoGesture extends StatefulWidget {
  const TikTokVideoGesture({
    super.key,
    required this.child,
    this.onAddFavorite,
    this.onSingleTap,
  });

  final VoidCallback? onAddFavorite;
  final VoidCallback? onSingleTap;
  final Widget child;

  @override
  State<TikTokVideoGesture> createState() => _TikTokVideoGestureState();
}

class _TikTokVideoGestureState extends State<TikTokVideoGesture> {
  final _key = GlobalKey();

  // 内部转换坐标点
  Offset _p(Offset p) {
    RenderBox getBox = _key.currentContext!.findRenderObject() as RenderBox;
    return getBox.globalToLocal(p);
  }

  List<Offset> icons = [];

  bool canAddFavorite = false;
  bool justAddFavorite = false;
  Timer? timer;

  @override
  Widget build(BuildContext context) {
    var iconStack = Stack(
      children: icons
          .map<Widget>(
            (p) => TikTokFavoriteAnimationIcon(
              key: Key(p.toString()),
              position: p,
              onAnimationComplete: () {
                icons.remove(p);
              },
            ),
          )
          .toList(),
    );
    return GestureDetector(
      key: _key,
      onTapDown: (detail) {
        setState(() {
          if (canAddFavorite) {
            print('添加爱心，当前爱心数量:${icons.length}');
            icons.add(_p(detail.globalPosition));
            widget.onAddFavorite?.call();
            justAddFavorite = true;
          } else {
            justAddFavorite = false;
          }
        });
      },
      onTapUp: (detail) {
        timer?.cancel();
        var delay = canAddFavorite ? 1200 : 600;
        timer = Timer(Duration(milliseconds: delay), () {
          canAddFavorite = false;
          timer = null;
          if (!justAddFavorite) {
            widget.onSingleTap?.call();
          }
        });
        canAddFavorite = true;
      },
      onTapCancel: () {
        print('onTapCancel');
      },
      child: Stack(
        children: <Widget>[
          widget.child,
          iconStack,
        ],
      ),
    );
  }
}
