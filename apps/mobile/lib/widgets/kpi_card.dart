import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class KpiCard extends StatelessWidget {
  final String label;
  final double value;
  final Color valueColor;
  final Color? iconBgColor;
  final IconData icon;
  final double? changePercent;

  const KpiCard({
    super.key,
    required this.label,
    required this.value,
    required this.valueColor,
    this.iconBgColor,
    required this.icon,
    this.changePercent,
  });

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.simpleCurrency(locale: 'pt_BR');

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Circular icon
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: iconBgColor ?? valueColor,
            shape: BoxShape.circle,
          ),
          child: Icon(icon, size: 18, color: Colors.white),
        ),
        const SizedBox(height: 10),
        // Label
        Text(
          label,
          style: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 11,
            fontWeight: FontWeight.w500,
            color: Color(0xFF6B7280),
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 4),
        // Value
        Text(
          currencyFormat.format(value),
          style: TextStyle(
            fontFamily: 'Outfit',
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: valueColor,
          ),
          textAlign: TextAlign.center,
        ),
        // Change percent
        if (changePercent != null) ...[
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                changePercent! >= 0
                    ? Icons.arrow_upward
                    : Icons.arrow_downward,
                size: 9,
                color: changePercent! >= 0
                    ? const Color(0xFF22C55E)
                    : const Color(0xFFEF4444),
              ),
              const SizedBox(width: 2),
              Text(
                '${changePercent!.abs().toStringAsFixed(0)}%',
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: changePercent! >= 0
                      ? const Color(0xFF22C55E)
                      : const Color(0xFFEF4444),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}
