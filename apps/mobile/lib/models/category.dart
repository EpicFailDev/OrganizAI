import 'package:flutter/material.dart';

class Category {
  final String id;
  final String name;
  final String type;
  final String color;
  final String? icon;
  final String? familyId;

  const Category({
    required this.id,
    required this.name,
    required this.type,
    required this.color,
    this.icon,
    this.familyId,
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'] as String,
      name: json['name'] as String,
      type: json['type'] as String,
      color: json['color'] as String? ?? '#9E9E9E',
      icon: json['icon'] as String?,
      familyId: json['family_id'] as String?,
    );
  }

  Color get parsedColor =>
      Color(int.parse(color.replaceFirst('#', '0xFF')));

  bool get isGlobal => familyId == null;
}
