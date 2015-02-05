if (!defined $ARGV[0]) {
	die "Please give the number of minutes.\n";
}

$thetime = time() + ($ARGV[0] * 60);
#time2str(time)
print time2str($thetime);


exit;

sub time2str (;$)
{
	my $time = shift;
	$time = time unless defined $time;
	@DoW = ("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat");
	@MoY = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec");
	my ($sec, $min, $hour, $mday, $mon, $year, $wday) = gmtime($time);
	sprintf("%s, %02d %s %04d %02d:%02d:%02d GMT\n",
		$DoW[$wday],
		$mday, $MoY[$mon], $year+1900,
		$hour, $min, $sec);
}


