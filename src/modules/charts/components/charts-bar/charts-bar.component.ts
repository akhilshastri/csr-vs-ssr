import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    OnInit,
    ViewChild,PLATFORM_ID,Inject
} from '@angular/core';
import { Chart } from 'chart.js';
import { isPlatformBrowser } from '@angular/common';
@Component({
    selector: 'sb-charts-bar',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './charts-bar.component.html',
    styleUrls: ['charts-bar.component.scss'],
})
export class ChartsBarComponent implements OnInit, AfterViewInit {
    @ViewChild('myBarChart') myBarChart!: ElementRef<HTMLCanvasElement>;
    chart!: Chart;
    isBrowser: boolean;
    constructor(@Inject(PLATFORM_ID) platformId: Object) {
        this.isBrowser = isPlatformBrowser(platformId);
    }

    ngOnInit() {}

    ngAfterViewInit() {
        if(!this.myBarChart) return;
        this.chart = new Chart(this.myBarChart.nativeElement, {
            type: 'bar',
            data: {
                labels: ['January', 'February', 'March', 'April', 'May', 'June'],
                datasets: [
                    {
                        label: 'Revenue',
                        backgroundColor: 'rgba(2,117,216,1)',
                        borderColor: 'rgba(2,117,216,1)',
                        data: [4215, 5312, 6251, 7841, 9821, 14984],
                    },
                ],
            },
            options: {
                scales: {
                    xAxes: [
                        {
                            time: {
                                unit: 'month',
                            },
                            gridLines: {
                                display: false,
                            },
                            ticks: {
                                maxTicksLimit: 6,
                            },
                        },
                    ],
                    yAxes: [
                        {
                            ticks: {
                                min: 0,
                                max: 15000,
                                maxTicksLimit: 5,
                            },
                            gridLines: {
                                display: true,
                            },
                        },
                    ],
                },
                legend: {
                    display: false,
                },
            },
        });
    }
}
