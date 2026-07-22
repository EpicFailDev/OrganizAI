import 'dart:math';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../theme/app_colors.dart';

class BalanceHeroCard extends StatefulWidget {
  final double balance;
  final double totalIncome;
  final double totalExpense;
  final double previousBalance;
  final List<double> balanceHistory;

  const BalanceHeroCard({
    super.key,
    required this.balance,
    required this.totalIncome,
    required this.totalExpense,
    this.previousBalance = 0,
    this.balanceHistory = const [],
  });

  @override
  State<BalanceHeroCard> createState() => _BalanceHeroCardState();
}

class _BalanceHeroCardState extends State<BalanceHeroCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _scaleAnim;
  bool _obscureValue = false;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _scaleAnim = Tween<double>(begin: 0.92, end: 1.0).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeOutBack),
    );
    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.simpleCurrency(locale: 'pt_BR');
    final changePercent = widget.previousBalance > 0
        ? ((widget.balance - widget.previousBalance) /
            widget.previousBalance *
            100)
        : 12.0;
    final isPositive = changePercent >= 0;

    return AnimatedBuilder(
      animation: _scaleAnim,
      builder: (context, child) {
        return Transform.scale(
          scale: _scaleAnim.value,
          child: child,
        );
      },
      child: Container(
        width: double.infinity,
        constraints: const BoxConstraints(minHeight: 220),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment(-0.9, -0.9),
            end: Alignment(0.9, 0.9),
            colors: [
              Color(0xFF1A3A2A),
              Color(0xFF132E20),
              Color(0xFF0E2418),
            ],
          ),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.3),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: Stack(
            children: [
              // Line chart at bottom, behind content
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                height: 70,
                child: _BalanceLineChart(
                  data: widget.balanceHistory.isNotEmpty
                      ? widget.balanceHistory
                      : _generateMockData(widget.balance),
                ),
              ),
              // Content
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 16, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Eye icon
                    GestureDetector(
                      onTap: () =>
                          setState(() => _obscureValue = !_obscureValue),
                      child: Icon(
                        _obscureValue
                            ? Icons.visibility_off_outlined
                            : Icons.visibility_outlined,
                        size: 20,
                        color: Colors.white.withValues(alpha: 0.5),
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Text + Wallet side by side
                    SizedBox(
                      height: 130,
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Left: text
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  'Saldo Total',
                                  style: TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 14,
                                    color: Colors.white.withValues(alpha: 0.6),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  _obscureValue
                                      ? '••••••'
                                      : currencyFormat.format(widget.balance),
                                  style: const TextStyle(
                                    fontFamily: 'Outfit',
                                    fontSize: 32,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                    height: 1.1,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Row(
                                  children: [
                                    Icon(
                                      isPositive
                                          ? Icons.arrow_upward
                                          : Icons.arrow_downward,
                                      size: 12,
                                      color: isPositive
                                          ? AppColors.income
                                          : AppColors.expense,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      '${changePercent.abs().toStringAsFixed(0)}% vs mês anterior',
                                      style: TextStyle(
                                        fontFamily: 'Inter',
                                        fontSize: 11,
                                        color: Colors.white.withValues(alpha: 0.5),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          // Right: wallet icon
                          SizedBox(
                            width: 130,
                            child: Image.asset(
                              'assets/wallet_icon.png',
                              fit: BoxFit.contain,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<double> _generateMockData(double current) {
    // Create a realistic upward-trending chart with dips
    return [
      current * 0.65,
      current * 0.62,
      current * 0.68,
      current * 0.72,
      current * 0.70,
      current * 0.75,
      current * 0.73,
      current * 0.78,
      current * 0.82,
      current * 0.80,
      current * 0.85,
      current * 0.88,
      current * 0.86,
      current * 0.90,
      current * 0.92,
      current * 0.95,
      current * 0.98,
      current * 1.0,
    ];
  }
}

// ─── 3D Wallet Icon ─────────────────────────────────────────

class _WalletPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // Shadow under wallet
    final shadowPaint = Paint()
      ..color = Colors.black.withValues(alpha: 0.25)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.06, h * 0.32, w * 0.78, h * 0.55),
        const Radius.circular(16),
      ),
      shadowPaint,
    );

    // Cards sticking out the top (bright lime green)
    final cardPaint1 = Paint()
      ..shader = ui.Gradient.linear(
        Offset(w * 0.18, h * 0.0),
        Offset(w * 0.18, h * 0.28),
        [const Color(0xFFAEEA00), const Color(0xFF9CCC65)],
      );
    final card1 = RRect.fromRectAndRadius(
      Rect.fromLTWH(w * 0.18, h * 0.0, w * 0.58, h * 0.24),
      const Radius.circular(10),
    );
    canvas.drawRRect(card1, cardPaint1);

    final cardPaint2 = Paint()
      ..shader = ui.Gradient.linear(
        Offset(w * 0.22, h * 0.0),
        Offset(w * 0.22, h * 0.24),
        [const Color(0xFFC6FF00), const Color(0xFFAEEA00)],
      );
    final card2 = RRect.fromRectAndRadius(
      Rect.fromLTWH(w * 0.22, h * 0.04, w * 0.54, h * 0.22),
      const Radius.circular(10),
    );
    canvas.drawRRect(card2, cardPaint2);

    // Wallet body - bright lime green
    final bodyPaint = Paint()
      ..shader = ui.Gradient.linear(
        Offset(w * 0.04, h * 0.28),
        Offset(w * 0.82, h * 0.88),
        [
          const Color(0xFFAEEA00),
          const Color(0xFF9CCC65),
          const Color(0xFF8BC34A),
        ],
      );

    final bodyRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(w * 0.04, h * 0.24, w * 0.82, h * 0.62),
      const Radius.circular(16),
    );
    canvas.drawRRect(bodyRect, bodyPaint);

    // Wallet flap (top fold) - lighter lime
    final flapPaint = Paint()
      ..shader = ui.Gradient.linear(
        Offset(0, h * 0.12),
        Offset(w * 0.5, h * 0.32),
        [
          const Color(0xFFC6FF00),
          const Color(0xFFAEEA00),
        ],
      );

    final flapPath = Path();
    flapPath.moveTo(w * 0.04, h * 0.33);
    flapPath.lineTo(w * 0.04, h * 0.16);
    flapPath.quadraticBezierTo(w * 0.04, h * 0.1, w * 0.12, h * 0.1);
    flapPath.lineTo(w * 0.62, h * 0.1);
    flapPath.quadraticBezierTo(w * 0.7, h * 0.1, w * 0.72, h * 0.16);
    flapPath.lineTo(w * 0.72, h * 0.33);
    flapPath.close();
    canvas.drawPath(flapPath, flapPaint);

    // Clasp strap (horizontal band on right)
    final strapPaint = Paint()
      ..shader = ui.Gradient.linear(
        Offset(w * 0.58, h * 0.36),
        Offset(w * 0.98, h * 0.58),
        [
          const Color(0xFFC6FF00),
          const Color(0xFFAEEA00),
        ],
      );

    final strapPath = Path();
    strapPath.moveTo(w * 0.6, h * 0.4);
    strapPath.lineTo(w * 0.9, h * 0.4);
    strapPath.quadraticBezierTo(w * 0.96, h * 0.4, w * 0.96, h * 0.45);
    strapPath.lineTo(w * 0.96, h * 0.54);
    strapPath.quadraticBezierTo(w * 0.96, h * 0.59, w * 0.9, h * 0.59);
    strapPath.lineTo(w * 0.6, h * 0.59);
    strapPath.close();
    canvas.drawPath(strapPath, strapPaint);

    // Clasp button (circle) - bright
    final claspPaint = Paint()
      ..shader = ui.Gradient.linear(
        Offset(w * 0.76, h * 0.42),
        Offset(w * 0.88, h * 0.57),
        [
          const Color(0xFFD4E157),
          const Color(0xFFC6FF00),
        ],
      );

    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(w * 0.81, h * 0.495),
        width: w * 0.13,
        height: w * 0.13,
      ),
      claspPaint,
    );

    // Inner circle of clasp
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(w * 0.81, h * 0.495),
        width: w * 0.065,
        height: w * 0.065,
      ),
      Paint()..color = const Color(0xFF9CCC65),
    );

    // Highlight on top edge of body (glossy effect)
    final highlightPaint = Paint()
      ..shader = ui.Gradient.linear(
        Offset(0, h * 0.24),
        Offset(0, h * 0.36),
        [
          Colors.white.withValues(alpha: 0.18),
          Colors.white.withValues(alpha: 0.0),
        ],
      );
    canvas.drawRRect(bodyRect, highlightPaint);

    // Bottom shadow gradient on body
    final bodyShadow = Paint()
      ..shader = ui.Gradient.linear(
        Offset(0, h * 0.72),
        Offset(0, h * 0.92),
        [
          Colors.black.withValues(alpha: 0.0),
          Colors.black.withValues(alpha: 0.12),
        ],
      );
    canvas.drawRRect(bodyRect, bodyShadow);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// ─── Line chart ─────────────────────────────────────────────

class _BalanceLineChart extends StatelessWidget {
  final List<double> data;

  const _BalanceLineChart({required this.data});

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) return const SizedBox.shrink();

    final minVal = data.reduce(min);
    final maxVal = data.reduce(max);
    final range = (maxVal - minVal).abs();
    final normalized = data.map((v) {
      if (range == 0) return 0.5;
      return (v - minVal) / range;
    }).toList();

    return CustomPaint(
      size: Size.infinite,
      painter: _LineChartPainter(data: normalized),
    );
  }
}

class _LineChartPainter extends CustomPainter {
  final List<double> data;

  _LineChartPainter({required this.data});

  @override
  void paint(Canvas canvas, Size size) {
    if (data.isEmpty) return;

    final lineColor = const Color(0xFFAEEA00);
    final dotColor = const Color(0xFFC6FF00);
    // Chart only takes 65% of width (leaves room for wallet)
    final chartWidth = size.width * 0.65;
    final step = chartWidth / (data.length - 1);

    final path = Path();
    final fillPath = Path();

    List<Offset> points = [];
    for (int i = 0; i < data.length; i++) {
      final x = i * step;
      final y =
          size.height - (data[i] * size.height * 0.6) - size.height * 0.2;
      points.add(Offset(x, y));
    }

    path.moveTo(points[0].dx, points[0].dy);
    fillPath.moveTo(points[0].dx, size.height);
    fillPath.lineTo(points[0].dx, points[0].dy);

    for (int i = 1; i < points.length; i++) {
      final prev = points[i - 1];
      final curr = points[i];
      final cpX = (prev.dx + curr.dx) / 2;
      path.cubicTo(cpX, prev.dy, cpX, curr.dy, curr.dx, curr.dy);
      fillPath.cubicTo(cpX, prev.dy, cpX, curr.dy, curr.dx, curr.dy);
    }

    fillPath.lineTo(points.last.dx, size.height);
    fillPath.close();

    // Fill gradient (vertical: green top → transparent bottom)
    final fillPaint = Paint()
      ..shader = ui.Gradient.linear(
        Offset(0, 0),
        Offset(0, size.height),
        [
          lineColor.withValues(alpha: 0.15),
          lineColor.withValues(alpha: 0.0),
        ],
      );
    canvas.drawPath(fillPath, fillPaint);

    // Line with horizontal fade (transparent left → opaque right)
    final linePaint = Paint()
      ..shader = ui.Gradient.linear(
        Offset(0, 0),
        Offset(chartWidth, 0),
        [
          lineColor.withValues(alpha: 0.0),
          lineColor.withValues(alpha: 0.3),
          lineColor.withValues(alpha: 0.7),
          lineColor,
        ],
        [0.0, 0.2, 0.5, 1.0],
      )
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    canvas.drawPath(path, linePaint);

    // Data points - fade from left to right
    for (int i = 0; i < points.length; i++) {
      final isLast = i == points.length - 1;
      final progress = i / (points.length - 1); // 0.0 to 1.0
      final opacity = (progress * 0.8 + 0.2).clamp(0.0, 1.0);

      // Glow
      canvas.drawCircle(
        points[i],
        isLast ? 6 : 3.5,
        Paint()..color = dotColor.withValues(alpha: 0.25 * opacity),
      );
      // Solid dot
      canvas.drawCircle(
        points[i],
        isLast ? 4 : 2.5,
        Paint()..color = dotColor.withValues(alpha: opacity),
      );
      // Inner bright center
      canvas.drawCircle(
        points[i],
        isLast ? 2 : 1.2,
        Paint()..color = Colors.white.withValues(alpha: 0.8 * opacity),
      );
    }
  }

  @override
  bool shouldRepaint(covariant _LineChartPainter oldDelegate) =>
      oldDelegate.data != data;
}
