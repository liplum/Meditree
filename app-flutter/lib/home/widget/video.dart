import 'package:meditree/home/widget/gesture.dart';
import 'package:flutter/material.dart';

class TikTokVideoPage extends StatelessWidget {
  final Widget? video;
  final double aspectRatio;
  final String? tag;
  final double bottomPadding;

  final Widget? sidebar;
  final Widget? userInfoWidget;

  final bool hidePauseIcon;

  final VoidCallback? onAddFavorite;
  final VoidCallback? onTap;

  const TikTokVideoPage({
    super.key,
    this.bottomPadding = 16,
    this.tag,
    this.sidebar,
    this.userInfoWidget,
    this.onAddFavorite,
    this.onTap,
    this.video,
    this.aspectRatio = 9 / 16.0,
    this.hidePauseIcon = false,
  });

  @override
  Widget build(BuildContext context) {
    // 用户信息
    Widget userInfo = userInfoWidget ?? const VideoUserInfo();
    // 视频加载的动画
    // Widget videoLoading = VideoLoadingPlaceHolder(tag: tag);
    return Stack(
      children: <Widget>[
        Container(
          height: double.infinity,
          width: double.infinity,
          alignment: Alignment.center,
          child: AspectRatio(
            aspectRatio: aspectRatio,
            child: video,
          ),
        ),
        TikTokVideoGesture(
          onAddFavorite: onAddFavorite,
          onSingleTap: onTap,
          child: Container(
            color: Colors.transparent,
            height: double.infinity,
            width: double.infinity,
          ),
        ),
        hidePauseIcon
            ? Container()
            : Container(
                height: double.infinity,
                width: double.infinity,
                alignment: Alignment.center,
                child: Icon(
                  Icons.play_circle_outline,
                  size: 120,
                  color: Colors.white.withOpacity(0.4),
                ),
              ),
        Container(
          height: double.infinity,
          width: double.infinity,
          alignment: Alignment.bottomRight,
          child: sidebar,
        ),
        Container(
          height: double.infinity,
          width: double.infinity,
          alignment: Alignment.bottomLeft,
          child: userInfo,
        ),
      ],
    );
  }
}

class VideoUserInfo extends StatelessWidget {
  final String? desc;

  // final Function onGoodGift;
  const VideoUserInfo({
    super.key,
    // @required this.onGoodGift,
    this.desc,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.only(right: 80),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            '@朱二旦的枯燥生活',
          ),
          Container(height: 6),
          Text(
            desc ?? '#原创 有钱人的生活就是这么朴实无华，且枯燥 #短视频',
          ),
          Container(height: 6),
          Row(
            children: <Widget>[
              Icon(Icons.music_note, size: 14),
              Expanded(
                child: Text(
                  '朱二旦的枯燥生活创作的原声',
                  maxLines: 9,
                ),
              )
            ],
          )
        ],
      ),
    );
  }
}
