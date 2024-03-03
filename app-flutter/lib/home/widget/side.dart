import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

class SideActionBar extends StatelessWidget {
  final double? bottomPadding;
  final bool isFavorite;
  final VoidCallback? onFavorite;
  final VoidCallback? onShare;
  const SideActionBar({
    super.key,
    this.bottomPadding,
    this.onFavorite,
    this.onShare,
    this.isFavorite= false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: <Widget>[
        FavoriteIcon(
          onFavorite: onFavorite,
          isFavorite: isFavorite,
        ),
        _IconButton(
          icon: IconToText(Icons.share),
          text: '346',
          onTap: onShare,
        ),
      ],
    );
  }
}

class FavoriteIcon extends StatelessWidget {
  const FavoriteIcon({
    super.key,
    required this.onFavorite,
    this.isFavorite,
  });
  final bool? isFavorite;
  final VoidCallback? onFavorite;

  @override
  Widget build(BuildContext context) {
    return _IconButton(
      icon: IconToText(
        Icons.favorite,
        color: isFavorite! ? Colors.red : null,
      ),
      text: '1.0w',
      onTap: onFavorite,
    );
  }
}

/// 把IconData转换为文字，使其可以使用文字样式
class IconToText extends StatelessWidget {
  final IconData? icon;
  final TextStyle? style;
  final double? size;
  final Color? color;

  const IconToText(
    this.icon, {
    super.key,
    this.style,
    this.size,
    this.color,
  });
  @override
  Widget build(BuildContext context) {
    return Text(
      String.fromCharCode(icon!.codePoint),
      style: style ??
          TextStyle(
            fontFamily: 'MaterialIcons',
            fontSize: size ?? 30,
            inherit: true,
            color: color ,
          ),
    );
  }
}

class _IconButton extends StatelessWidget {
  final Widget? icon;
  final String? text;
  final VoidCallback? onTap;
  const _IconButton({
    super.key,
    this.icon,
    this.text,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    var shadowStyle = TextStyle(
      shadows: [
        Shadow(
          color: Colors.black.withOpacity(0.15),
          offset: Offset(0, 1),
          blurRadius: 1,
        ),
      ],
    );
    Widget body = Column(
      children: <Widget>[
        CupertinoButton(
          child: icon ?? Container(),
          onPressed: onTap,
        ),
        Container(height: 2),
        Text(
          text ?? '??',
          style: TextStyle(
            fontWeight: FontWeight.normal,
          ),
        ),
      ],
    );
    return Container(
      padding: EdgeInsets.symmetric(vertical: 10),
      child: DefaultTextStyle(
        child: body,
        style: shadowStyle,
      ),
    );
  }
}
