import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';


class IosBackButton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return CupertinoButton(
      child: Container(
        color: Colors.white.withOpacity(0),
        padding: EdgeInsets.symmetric(horizontal: 6, vertical: 16),
        child: Icon(
          Icons.arrow_back_ios,
          size: 18,
        ),
      ),
      onPressed: () {
        Navigator.of(context).pop();
      },
    );
  }
}
