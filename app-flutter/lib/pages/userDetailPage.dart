import 'package:flutter/cupertino.dart';
import 'package:meditree/style/style.dart';
import 'package:flutter/material.dart';
import 'package:rettulf/rettulf.dart';

class UserDetailPage extends StatefulWidget {
  @override
  _UserDetailPageState createState() => _UserDetailPageState();
}

class _UserDetailPageState extends State<UserDetailPage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: "User".text(),
      ),
      body: ListView(
        padding: EdgeInsets.only(
          bottom: 80 + MediaQuery.of(context).padding.bottom,
        ),
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(
                child: Container(
                  padding: EdgeInsets.symmetric(vertical: 10, horizontal: 20),
                  child: Text(
                    '个人信息',
                    style: StandardTextStyle.smallWithOpacity,
                  ),
                ),
              ),
              Container(
                padding: EdgeInsets.symmetric(vertical: 10, horizontal: 20),
                child: Text(
                  '修改',
                  style: StandardTextStyle.smallWithOpacity.apply(
                    color: ColorPlate.orange,
                  ),
                ),
              )
            ],
          ),
          _UserInfoRow(
            title: '昵称',
            rightIcon: Text(
              '朱二蛋的枯燥生活',
              style: StandardTextStyle.small,
            ),
          ),
          _UserInfoRow(
            title: '头像',
            rightIcon: Text(
              '上传',
              style: StandardTextStyle.small,
            ),
          ),
          _UserInfoRow(
            title: '手机绑定',
            rightIcon: Text(
              '186****7767',
              style: StandardTextStyle.small,
            ),
          ),
          _UserInfoRow(
            title: '地址',
            rightIcon: Text(
              '深圳市南山区南海大道',
              style: StandardTextStyle.small,
            ),
          ),
          _UserInfoRow(
            title: '年龄',
            rightIcon: Text(
              '18',
              style: StandardTextStyle.small,
            ),
          ),
          _UserInfoRow(
            title: '用户性别',
            rightIcon: Text(
              '男',
              style: StandardTextStyle.small,
            ),
          ),
          _UserInfoRow(
            title: '职业',
            rightIcon: Text(
              '总裁',
              style: StandardTextStyle.small,
            ),
          ),
        ],
      ),
    );
  }
}

class _UserInfoRow extends StatelessWidget {
  _UserInfoRow({
    this.icon,
    this.title,
    this.rightIcon,
    this.onTap,
  });
  final Widget? icon;
  final Widget? rightIcon;
  final String? title;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    Widget iconImg = Container(
      height: 24,
      width: 24,
      child: icon,
    );

    Widget row = Container(
      height: 48,
      padding: EdgeInsets.fromLTRB(16, 0, 16, 0),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.02),
        border: Border(
          bottom: BorderSide(color: Colors.white12),
        ),
      ),
      child: Row(
        children: <Widget>[
          icon != null ? iconImg : Container(),
          Expanded(
            child: Container(
              padding: EdgeInsets.only(left: 12),
              child: Text(
                title!,
                style: TextStyle(fontSize: 14),
              ),
            ),
          ),
          Opacity(
            opacity: 0.6,
            child: rightIcon ??
                Icon(
                  Icons.arrow_forward_ios,
                  size: 12,
                ),
          ),
        ],
      ),
    );
    row = CupertinoButton(
      onPressed: onTap,
      child: row,
    );

    return row;
  }
}
