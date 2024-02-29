import 'package:meditree/mock/video.dart';
import 'package:meditree/home/widget/scaffold.dart';
import 'package:meditree/home/widget/video.dart';
import 'package:meditree/home/widget/side.dart';
import 'package:meditree/home/controller/video_list.dart';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> with WidgetsBindingObserver {
  final _pageController = PageController();

  final _videoListController = TikTokVideoListController();

  List<UserVideo> videoDataList = [];

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) async {
    if (state != AppLifecycleState.resumed) {
      _videoListController.currentPlayer.pause();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _pageController.dispose();
    _videoListController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    videoDataList = UserVideo.fetchVideo();
    WidgetsBinding.instance.addObserver(this);
    _videoListController.init(
      pageController: _pageController,
      initialList: videoDataList
          .map(
            (e) => VPVideoController(
              videoInfo: e,
              builder: () => VideoPlayerController.networkUrl(Uri.parse(e.url)),
            ),
          )
          .toList(),
      videoProvider: (int index, List<VPVideoController> list) async {
        return videoDataList
            .map(
              (e) => VPVideoController(
                videoInfo: e,
                builder: () => VideoPlayerController.networkUrl(Uri.parse(e.url)),
              ),
            )
            .toList();
      },
    );
    _videoListController.addListener(() {
      setState(() {});
    });
    super.initState();
  }

  void onNavigate() {
    // if (tabBarType == TikTokPageTag.home) {
    //   _videoListController.currentPlayer.play();
    // } else {
    //   _videoListController.currentPlayer.pause();
    // }
  }

  @override
  Widget build(BuildContext context) {
    return TikTokScaffold(
      // onPullDownRefresh: _fetchData,
      page: Stack(
        children: <Widget>[
          PageView.builder(
            physics: const BouncingScrollPhysics(),
            controller: _pageController,
            scrollDirection: Axis.vertical,
            itemCount: _videoListController.videoCount,
            itemBuilder: (context, i) {
              final controller = _videoListController.playerOfIndex(i)!;
              return VideoPage(
                key: ValueKey("${controller.videoInfo?.url} $i"),
                controller: _videoListController.playerOfIndex(i)!,
              );
            },
          ),
        ],
      ),
    );
  }
}

class VideoPage extends StatefulWidget {
  final VPVideoController controller;

  const VideoPage({
    super.key,
    required this.controller,
  });

  @override
  State<VideoPage> createState() => _VideoPageState();
}

class _VideoPageState extends State<VideoPage> {
  bool favorite = false;

  @override
  Widget build(BuildContext context) {
    var player = widget.controller;
    var data = player.videoInfo!;
    // 右侧按钮列
    Widget buttons = TikTokButtonColumn(
      isFavorite: favorite,
      onFavorite: () {
        setState(() {
          favorite = !favorite;
        });
        // showAboutDialog(context: context);
      },
      onShare: () {},
    );
    // video
    return TikTokVideoPage(
      // 手势播放与自然播放都会产生暂停按钮状态变化，待处理
      hidePauseIcon: !player.showPauseIcon.value,
      aspectRatio: 9 / 16.0,
      tag: data.url,
      userInfoWidget: VideoUserInfo(
        desc: data.desc,
      ),
      onTap: () async {
        if (player.controller.value.isPlaying) {
          await player.pause();
        } else {
          await player.play();
        }
        setState(() {});
      },
      onAddFavorite: () {
        setState(() {
          favorite = true;
        });
      },
      rightButtonColumn: buttons,
      video: Center(
        child: AspectRatio(
          aspectRatio: player.controller.value.aspectRatio,
          child: VideoPlayer(player.controller),
        ),
      ),
    );
  }
}
