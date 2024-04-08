import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TradeHeaderComponent } from './trade-header.component';

describe('TradeHeaderComponent', () => {
  let component: TradeHeaderComponent;
  let fixture: ComponentFixture<TradeHeaderComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TradeHeaderComponent]
    });
    fixture = TestBed.createComponent(TradeHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
